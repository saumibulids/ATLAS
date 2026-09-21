"""Tutor service layer for ATLAS chat."""

from pathlib import Path

from sqlalchemy.orm import Session

from app.agents.foundry_agent import ask_atlas
from app.core.config import get_settings
from app.database.repositories.chat_repository import (
    add_message,
    create_session,
    get_active_session,
    get_recent_history,
    get_session,
    get_session_messages,
)
from app.database.repositories.student_repository import get_student_with_state
from app.schemas.chat import ChatRequest, ChatResponse, MessageRead, StudentStateSummary

PROMPT_PATH = Path(__file__).resolve().parents[1] / "agents" / "prompts" / "atlas_system_prompt.md"


def chat_with_atlas(db: Session, payload: ChatRequest) -> ChatResponse | None:
    settings = get_settings()
    student = get_student_with_state(db, payload.student_id)
    if student is None or student.learning_state is None:
        return None

    chat_session = get_active_session(
        db,
        student,
        payload.subject,
        payload.topic,
        settings.session_timeout_minutes,
    )
    if chat_session is None:
        chat_session = create_session(db, student, payload.subject, payload.topic)

    history = _messages_to_history(
        get_recent_history(db, chat_session.id, settings.chat_history_limit)
    )
    add_message(db, chat_session.id, "user", payload.message)

    system_prompt = _build_system_prompt(student)
    reply = ask_atlas(
        system_prompt=system_prompt,
        history=history,
        user_message=payload.message,
    )
    add_message(db, chat_session.id, "assistant", reply)

    return ChatResponse(
        session_id=chat_session.id,
        reply=reply,
        student_state=StudentStateSummary(
            mastery=student.learning_state.mastery,
            confidence=student.learning_state.confidence,
        ),
    )


def get_session_message_history(db: Session, session_id: int) -> list[MessageRead] | None:
    if get_session(db, session_id) is None:
        return None
    return [MessageRead.model_validate(message, from_attributes=True) for message in get_session_messages(db, session_id)]


def _messages_to_history(messages) -> list[dict[str, str]]:
    return [{"role": message.role, "content": message.content} for message in messages]


def _build_system_prompt(student) -> str:
    base_prompt = PROMPT_PATH.read_text(encoding="utf-8")
    context = _build_context_block(student)
    return f"{context}\n\n{base_prompt}" if context else base_prompt


def _build_context_block(student) -> str:
    state = student.learning_state
    lines = [
        "Student context:",
        f"- Language: {student.language}",
        f"- Explanation style: {student.explanation_style}",
    ]
    if student.subject or student.topic:
        current = " -> ".join(part for part in [student.subject, student.topic] if part)
        lines.append(f"- Current learning: {current}")
    if state and state.mistakes:
        lines.append(f"- Known mistakes: {', '.join(state.mistakes[:3])}")
    return "\n".join(lines)

"""Tutor service layer for ATLAS chat."""

from pathlib import Path

from sqlalchemy.orm import Session

from app.agents.foundry_agent import ask_atlas
from app.database.repositories.chat_repository import add_message, create_session, get_recent_history
from app.database.repositories.student_repository import get_student_with_state
from app.schemas.chat import ChatRequest, ChatResponse, StudentStateSummary

PROMPT_PATH = Path(__file__).resolve().parents[1] / "agents" / "prompts" / "atlas_system_prompt.md"


def chat_with_atlas(db: Session, payload: ChatRequest) -> ChatResponse | None:
    student = get_student_with_state(db, payload.student_id)
    if student is None or student.learning_state is None:
        return None

    history = [
        {"role": message.role, "content": message.content}
        for message in get_recent_history(db, student)
    ]
    chat_session = create_session(db, student, payload.subject, payload.topic)
    add_message(db, chat_session.id, "user", payload.message)

    system_prompt = PROMPT_PATH.read_text(encoding="utf-8")
    reply = ask_atlas(
        system_prompt=system_prompt,
        history=history,
        user_message=payload.message,
    )
    add_message(db, chat_session.id, "assistant", reply)

    return ChatResponse(
        reply=reply,
        student_state=StudentStateSummary(
            mastery=student.learning_state.mastery,
            confidence=student.learning_state.confidence,
        ),
    )

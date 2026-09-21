"""Tutor service layer for ATLAS chat."""

from pathlib import Path

from sqlalchemy.orm import Session

from app.agents.foundry_agent import TurnAnalysis, analyze_turn, ask_atlas
from app.core.config import get_settings
from app.database.repositories.chat_repository import (
    add_message,
    create_session,
    get_active_session,
    get_recent_history,
    get_session,
    get_session_messages,
)
from app.database.repositories.learning_event_repository import create_learning_event
from app.database.repositories.student_repository import get_student_with_state
from app.engine.adaptability import adjust_adaptability_for_transfer
from app.engine.confidence import adjust_confidence
from app.engine.mastery import apply_mastery_event
from app.engine.misconceptions import add_misconception
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
    analysis = _safe_analyze_turn(payload.message, _analysis_context(student, payload))
    _apply_turn_analysis(db, student, chat_session.id, analysis, payload.topic)

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


def _analysis_context(student, payload: ChatRequest) -> dict[str, object]:
    state = student.learning_state
    return {
        "student_id": student.student_id,
        "subject": payload.subject,
        "topic": payload.topic,
        "language": student.language,
        "explanation_style": student.explanation_style,
        "known_mistakes": list(state.mistakes or []) if state else [],
    }


def _safe_analyze_turn(student_message: str, tutor_context: dict[str, object]) -> TurnAnalysis:
    try:
        return analyze_turn(student_message, tutor_context)
    except Exception:
        return TurnAnalysis(
            concept=str(tutor_context.get("topic") or "current topic").lower(),
            answer_quality="none",
            hint_used=False,
            transfer=False,
            misconception=None,
            asked_for_confirmation=False,
        )


def _apply_turn_analysis(
    db: Session,
    student,
    session_id: int,
    analysis: TurnAnalysis,
    current_topic: str,
) -> None:
    state = student.learning_state
    if state is None:
        return

    concept = (analysis.concept or student.topic or "current topic").strip().lower()
    concept_scores = dict(state.concept_scores or {})
    mastery_before = float(concept_scores.get(concept, state.mastery or 0.0))
    mastery_after = mastery_before

    mastery_event = _mastery_event_for_analysis(analysis, state.mistakes or [])
    if mastery_event is not None:
        mastery_after = apply_mastery_event(mastery_before, mastery_event)
        concept_scores[concept] = mastery_after
        normalized_current_topic = (current_topic or concept).strip().lower()
        state.mastery = float(concept_scores.get(normalized_current_topic, mastery_after))
        state.concept_scores = concept_scores

    state.confidence = _updated_confidence(state.confidence, analysis)
    if analysis.transfer and analysis.answer_quality == "correct":
        state.adaptability = adjust_adaptability_for_transfer(state.adaptability, succeeded=True)

    if analysis.misconception:
        updated_mistakes, _ = add_misconception(state.mistakes or [], analysis.misconception)
        state.mistakes = updated_mistakes

    db.add(state)
    db.commit()
    db.refresh(state)

    if mastery_event is not None:
        create_learning_event(
            db,
            student_id=student.id,
            session_id=session_id,
            concept=concept,
            answer_quality=analysis.answer_quality,
            mastery_before=mastery_before,
            mastery_after=mastery_after,
        )


def _mastery_event_for_analysis(analysis: TurnAnalysis, existing_mistakes: list[str]) -> str | None:
    if analysis.answer_quality == "correct":
        if analysis.transfer:
            return "correct_new_context"
        if analysis.hint_used:
            return "correct_with_hint"
        return "correct_independently"
    if analysis.answer_quality == "partial":
        return "correct_with_hint"
    if analysis.answer_quality == "incorrect":
        if analysis.misconception and _is_repeat_misconception(existing_mistakes, analysis.misconception):
            return "repeated_misconception"
        return "incorrect"
    return None


def _updated_confidence(current_confidence: float, analysis: TurnAnalysis) -> float:
    confidence = current_confidence
    if analysis.answer_quality == "correct":
        confidence = adjust_confidence(confidence, "independent_success")
        if analysis.transfer:
            confidence = adjust_confidence(confidence, "successful_transfer")
    elif analysis.answer_quality in {"partial", "incorrect"}:
        confidence = adjust_confidence(confidence, "independent_attempt")
    elif analysis.answer_quality == "dont_know":
        confidence = adjust_confidence(confidence, "i_dont_know")

    if analysis.asked_for_confirmation:
        confidence = adjust_confidence(confidence, "repeated_confirmation")

    return confidence


def _is_repeat_misconception(existing_mistakes: list[str], misconception: str) -> bool:
    return any(item.casefold() == misconception.casefold() for item in existing_mistakes)

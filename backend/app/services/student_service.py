"""Student service layer."""

from sqlalchemy.orm import Session

from app.database.repositories.chat_repository import get_student_sessions
from app.database.repositories.learning_event_repository import get_recent_learning_events
from app.database.repositories.student_repository import (
    create_student as create_student_record,
    get_student_with_state,
    update_student as update_student_record,
)
from app.engine.mastery import mastery_band_label
from app.engine.next_activity import recommend_next_activity
from app.schemas.progress import LearningEventRead, NextActivityRead, ProgressRead
from app.schemas.student import (
    CurrentLearning,
    SessionRead,
    StudentCreate,
    StudentPatch,
    StudentRead,
)


def create_student_profile(db: Session, payload: StudentCreate) -> StudentRead:
    student = create_student_record(
        db,
        name=payload.name,
        grade=payload.grade,
        language=payload.language,
        explanation_style=payload.explanation_style,
    )
    return _student_to_read(student)


def get_student_profile(db: Session, student_id: str) -> StudentRead | None:
    student = get_student_with_state(db, student_id)
    if student is None or student.learning_state is None:
        return None

    return _student_to_read(student)


def update_student_profile(db: Session, student_id: str, payload: StudentPatch) -> StudentRead | None:
    student = get_student_with_state(db, student_id)
    if student is None or student.learning_state is None:
        return None

    updates = payload.model_dump(exclude_unset=True)
    current_learning = updates.pop("current_learning", None)
    if current_learning is not None:
        if current_learning.get("subject") is not None:
            updates["subject"] = current_learning["subject"]
        if current_learning.get("topic") is not None:
            updates["topic"] = current_learning["topic"]

    preferences = dict(student.preferences or {})
    if updates.get("preferences") is not None:
        preferences.update(updates.pop("preferences"))
    if updates.get("explanation_style") is not None:
        preferences["explanation_style"] = updates["explanation_style"]
    updates["preferences"] = preferences

    student = update_student_record(db, student, updates)
    return _student_to_read(student)


def list_student_sessions(db: Session, student_id: str) -> list[SessionRead] | None:
    student = get_student_with_state(db, student_id)
    if student is None:
        return None

    return [SessionRead.model_validate(session) for session in get_student_sessions(db, student)]


def get_student_progress(db: Session, student_id: str) -> ProgressRead | None:
    student = get_student_with_state(db, student_id)
    if student is None or student.learning_state is None:
        return None

    state = student.learning_state
    return ProgressRead(
        student_id=student.student_id,
        mastery=state.mastery,
        mastery_band=mastery_band_label(state.mastery),
        confidence=state.confidence,
        adaptability=state.adaptability,
        pace=state.pace,
        concept_scores=state.concept_scores,
        recent_learning_events=[
            LearningEventRead.model_validate(event, from_attributes=True)
            for event in get_recent_learning_events(db, student)
        ],
    )


def get_student_next_activity(db: Session, student_id: str) -> NextActivityRead | None:
    student = get_student_with_state(db, student_id)
    if student is None or student.learning_state is None:
        return None

    state = student.learning_state
    recommendation = recommend_next_activity(
        {
            "topic": student.topic,
            "mastery": state.mastery,
            "concept_scores": state.concept_scores,
            "mistakes": state.mistakes,
        }
    )
    return NextActivityRead(**recommendation)


def _student_to_read(student) -> StudentRead:
    return StudentRead(
        student_id=student.student_id,
        name=student.name,
        grade=student.grade,
        language=student.language,
        explanation_style=student.explanation_style,
        preferences=student.preferences or {},
        current_learning=CurrentLearning(subject=student.subject, topic=student.topic),
        learning_state=student.learning_state,
    )

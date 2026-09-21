"""Repository helpers for learning event audit records."""

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.models.learning_event import LearningEvent
from app.models.student import Student


def create_learning_event(
    db: Session,
    *,
    student_id: int,
    session_id: int | None,
    concept: str,
    answer_quality: str,
    mastery_before: float,
    mastery_after: float,
) -> LearningEvent:
    event = LearningEvent(
        student_id=student_id,
        session_id=session_id,
        concept=concept,
        answer_quality=answer_quality,
        mastery_before=mastery_before,
        mastery_after=mastery_after,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def get_recent_learning_events(
    db: Session,
    student: Student,
    limit: int = 10,
) -> list[LearningEvent]:
    statement = (
        select(LearningEvent)
        .where(LearningEvent.student_id == student.id)
        .order_by(desc(LearningEvent.timestamp), desc(LearningEvent.id))
        .limit(limit)
    )
    return list(db.scalars(statement).all())

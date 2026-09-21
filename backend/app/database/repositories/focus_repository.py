"""Repository helpers for focus session persistence."""

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.focus_session import FocusInterruption, FocusSession

ACTIVE_STATUSES = ("active", "on_break")
ENDED_STATUSES = ("completed", "abandoned")


def get_focus_session(db: Session, session_id: int) -> FocusSession | None:
    statement = (
        select(FocusSession)
        .where(FocusSession.id == session_id)
        .options(selectinload(FocusSession.interruptions))
    )
    return db.scalars(statement).first()


def get_active_focus_session(db: Session, student_pk: int) -> FocusSession | None:
    statement = (
        select(FocusSession)
        .where(FocusSession.student_id == student_pk, FocusSession.status.in_(ACTIVE_STATUSES))
        .options(selectinload(FocusSession.interruptions))
    )
    return db.scalars(statement).first()


def create_focus_session(
    db: Session,
    *,
    student_pk: int,
    topic: str | None,
    mode: str,
    planned_minutes: int,
    started_at,
    plan: list[dict] | None,
) -> FocusSession:
    session = FocusSession(
        student_id=student_pk,
        topic=topic,
        mode=mode,
        planned_minutes=planned_minutes,
        study_minutes=planned_minutes,
        started_at=started_at,
        plan=plan,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def add_interruption(db: Session, session: FocusSession, hidden_at) -> FocusInterruption:
    interruption = FocusInterruption(session_id=session.id, hidden_at=hidden_at)
    db.add(interruption)
    db.commit()
    db.refresh(interruption)
    return interruption
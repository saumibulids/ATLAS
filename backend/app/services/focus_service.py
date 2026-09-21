"""Focus service layer for Phase 6a (single focus sessions).

The backend is the source of truth for time. Elapsed/remaining time is always
computed from the recorded `started_at` and the interruption records, using an
injectable clock (`now=`). While a tab is hidden the timer is paused, so a
student is never penalized for stepping away — the session simply keeps its
remaining time until they return.
"""

import datetime as dt
import math

from sqlalchemy.orm import Session

from app.core.constants import (
    FOCUS_ABANDON_GRACE_MINUTES,
    FOCUS_COMPLETION_THRESHOLD,
    FOCUS_CUSTOM_DURATION_MAX_MINUTES,
    FOCUS_CUSTOM_DURATION_MIN_MINUTES,
    FOCUS_MASTERY_LEARN_SHIFT_PERCENT,
    FOCUS_PHASE_SPLIT_PERCENT,
)
from app.database.repositories.focus_repository import (
    add_interruption,
    create_focus_session,
    get_active_focus_session,
    get_focus_session,
)
from app.database.repositories.student_repository import get_student_with_state
from app.engine.mastery import mastery_band_label
from app.models.focus_session import FocusSession
from app.models.student import Student
from app.schemas.focus import (
    FocusCompleteRequest,
    FocusCompleteResponse,
    FocusInterruptResponse,
    FocusPhaseRead,
    FocusResumeResponse,
    FocusSessionRead,
    FocusStartResponse,
)
from app.services.gamification_service import award_focus_session

FOCUS_PHASE_ORDER = [
    "quick_revision",
    "learn",
    "practice",
    "notes_revision",
    "mini_assessment",
    "reflection",
]

FOCUS_PHASE_ACTIVITIES = {
    "quick_revision": "flashcards",
    "learn": "notes",
    "practice": "practice",
    "notes_revision": "notes",
    "mini_assessment": "practice",
    "reflection": "notes",
}

FOCUS_LOW_MASTERY_BANDS = {"Needs foundational teaching", "Developing"}
FOCUS_HIGH_MASTERY_BANDS = {"Strong", "Mastered"}

MESSAGE_INTERRUPT = (
    "Looks like you stepped away. Your focus session is still running. Come back when you're ready."
)
MESSAGE_EXPIRED = "This focus session was left running past its planned end and has been closed."
MESSAGE_COMPLETED = "Focus session completed."
MESSAGE_ABANDONED = (
    "Focus session ended before reaching the completion threshold. "
    "You can start a new session whenever you're ready."
)


class FocusSessionActiveError(Exception):
    """Raised when a student starts a focus session while one is still active."""


class FocusSessionEndedError(Exception):
    """Raised when acting on a focus session that is already completed or abandoned."""


def start_focus_session(
    db: Session,
    *,
    student_id: str,
    topic: str | None,
    mode: str,
    duration_minutes: int,
    now: dt.datetime | None = None,
) -> FocusStartResponse | None:
    started_at = _coerce_now(now)
    if mode != "single":
        raise ValueError("Only single focus sessions are available in this phase")
    if not _valid_duration(duration_minutes):
        raise ValueError(
            "duration_minutes must be one of the preset durations "
            f"({', '.join(str(value) for value in (25, 45, 60))}) "
            f"or between {FOCUS_CUSTOM_DURATION_MIN_MINUTES} and {FOCUS_CUSTOM_DURATION_MAX_MINUTES}"
        )

    student = get_student_with_state(db, student_id)
    if student is None or student.learning_state is None:
        return None
    if get_active_focus_session(db, student.id) is not None:
        raise FocusSessionActiveError()

    topic_slug = _slugify(topic) if topic else None
    mastery = float(
        (student.learning_state.concept_scores or {}).get(topic_slug, student.learning_state.mastery or 0.0)
    )
    plan = _build_plan(duration_minutes, _phase_shares(mastery))
    session = create_focus_session(
        db,
        student_pk=student.id,
        topic=topic_slug,
        mode=mode,
        planned_minutes=duration_minutes,
        started_at=started_at,
        plan=[phase.model_dump() for phase in plan],
    )
    return FocusStartResponse(
        session_id=session.id,
        topic=topic_slug,
        mode=session.mode,
        planned_minutes=session.planned_minutes,
        started_at=session.started_at,
        plan=plan,
        remaining_seconds=duration_minutes * 60,
        status=session.status,
        message="Focus session started.",
    )


def get_focus_session_state(
    db: Session,
    session_id: int,
    now: dt.datetime | None = None,
) -> FocusSessionRead | None:
    session = get_focus_session(db, session_id)
    if session is None:
        return None
    clock = _coerce_now(now)
    expired = _apply_expiry(db, session, clock)
    elapsed, remaining = _elapsed_and_remaining(session, clock)
    plan = _load_plan(session)
    return FocusSessionRead(
        session_id=session.id,
        student_id=_public_student_id(db, session.student_id),
        topic=session.topic,
        mode=session.mode,
        planned_minutes=session.planned_minutes,
        status=session.status,
        started_at=session.started_at,
        ended_at=session.ended_at,
        elapsed_seconds=elapsed,
        remaining_seconds=remaining,
        active_seconds=session.active_seconds,
        break_seconds=session.break_seconds,
        interruption_count=session.interruption_count,
        current_round=session.current_round,
        questions_attempted=session.questions_attempted,
        concepts_studied=list(session.concepts_studied or []),
        plan=plan,
        current_phase=_current_phase(plan, elapsed),
        message=MESSAGE_EXPIRED if expired else None,
    )


def interrupt_focus_session(
    db: Session,
    session_id: int,
    now: dt.datetime | None = None,
) -> FocusInterruptResponse | None:
    session = get_focus_session(db, session_id)
    if session is None:
        return None
    clock = _coerce_now(now)
    _apply_expiry(db, session, clock)
    if session.status not in ("active", "on_break"):
        raise FocusSessionEndedError()
    if _open_interruption(session) is None:
        add_interruption(db, session, clock)
        session = get_focus_session(db, session_id)
        session.interruption_count += 1
        db.add(session)
        db.commit()
        db.refresh(session)
    _, remaining = _elapsed_and_remaining(session, clock)
    return FocusInterruptResponse(
        session_id=session.id,
        message=MESSAGE_INTERRUPT,
        remaining_seconds=remaining,
        status=session.status,
    )


def resume_focus_session(
    db: Session,
    session_id: int,
    now: dt.datetime | None = None,
) -> FocusResumeResponse | None:
    session = get_focus_session(db, session_id)
    if session is None:
        return None
    clock = _coerce_now(now)
    _apply_expiry(db, session, clock)
    if session.status not in ("active", "on_break"):
        raise FocusSessionEndedError()
    interruption = _open_interruption(session)
    if interruption is not None:
        interruption.visible_at = clock
        interruption.seconds_away = max(0, int((clock - interruption.hidden_at).total_seconds()))
        db.add(interruption)
        db.commit()
        session = get_focus_session(db, session_id)
    _, remaining = _elapsed_and_remaining(session, clock)
    message = f"Welcome back! You have {math.ceil(remaining / 60)} minutes remaining."
    return FocusResumeResponse(
        session_id=session.id,
        message=message,
        remaining_seconds=remaining,
        status=session.status,
    )


def complete_focus_session(
    db: Session,
    session_id: int,
    payload: FocusCompleteRequest,
    now: dt.datetime | None = None,
) -> FocusCompleteResponse | None:
    session = get_focus_session(db, session_id)
    if session is None:
        return None
    clock = _coerce_now(now)
    if session.status not in ("active", "on_break"):
        raise FocusSessionEndedError()

    active_seconds = _elapsed_seconds(session, clock)
    session.active_seconds = active_seconds
    session.ended_at = clock
    if payload.questions_attempted is not None:
        session.questions_attempted = payload.questions_attempted
    if payload.concepts_studied is not None:
        session.concepts_studied = payload.concepts_studied
    threshold_seconds = int(session.planned_minutes * 60 * FOCUS_COMPLETION_THRESHOLD)
    completed = active_seconds >= threshold_seconds
    session.status = "completed" if completed else "abandoned"
    db.add(session)
    db.commit()
    db.refresh(session)

    gamification = None
    if completed:
        gamification = award_focus_session(
            db,
            _public_student_id(db, session.student_id),
            topic=session.topic,
        )
    return FocusCompleteResponse(
        session_id=session.id,
        status=session.status,
        active_seconds=session.active_seconds,
        planned_minutes=session.planned_minutes,
        message=MESSAGE_COMPLETED if completed else MESSAGE_ABANDONED,
        gamification=gamification,
    )


def _apply_expiry(db: Session, session: FocusSession, now: dt.datetime) -> bool:
    """Mark an overrun, never-completed session abandoned when it is read."""
    if session.status not in ("active", "on_break"):
        return False
    planned_end = session.started_at + dt.timedelta(minutes=session.planned_minutes)
    grace = dt.timedelta(minutes=FOCUS_ABANDON_GRACE_MINUTES)
    if now <= planned_end + grace:
        return False
    session.status = "abandoned"
    session.ended_at = now
    session.active_seconds = _elapsed_seconds(session, now)
    db.add(session)
    db.commit()
    db.refresh(session)
    return True


def _elapsed_and_remaining(session: FocusSession, now: dt.datetime) -> tuple[int, int]:
    elapsed = _elapsed_seconds(session, now)
    remaining = max(0, session.planned_minutes * 60 - elapsed)
    return elapsed, remaining


def _elapsed_seconds(session: FocusSession, now: dt.datetime) -> int:
    """Active wall-clock seconds, excluding time recorded in interruptions."""
    clock_end = session.ended_at if session.ended_at is not None else now
    total = max(0, int((clock_end - session.started_at).total_seconds()))
    away = sum(interruption.seconds_away for interruption in session.interruptions)
    return max(0, total - away)


def _phase_shares(mastery: float | None) -> dict[str, float]:
    """Mastery-adaptive phase weights. Low mastery tilts toward learning,
    high mastery toward practice and assessment."""
    shares = {phase: float(value) for phase, value in FOCUS_PHASE_SPLIT_PERCENT.items()}
    if mastery is None:
        return shares
    label = mastery_band_label(float(mastery))
    shift = float(FOCUS_MASTERY_LEARN_SHIFT_PERCENT)
    if label in FOCUS_LOW_MASTERY_BANDS:
        shares["learn"] += shift
        shares["practice"] = max(1.0, shares["practice"] - shift / 2)
        shares["mini_assessment"] = max(1.0, shares["mini_assessment"] - shift / 2)
    elif label in FOCUS_HIGH_MASTERY_BANDS:
        shares["learn"] = max(1.0, shares["learn"] - shift)
        shares["practice"] += shift / 2
        shares["mini_assessment"] += shift / 2
    return shares


def _build_plan(duration_minutes: int, shares: dict[str, float]) -> list[FocusPhaseRead]:
    """Allocate the duration across phases so the phases always sum to exactly
    the chosen duration (Hamilton largest-remainder apportionment)."""
    phase_count = len(FOCUS_PHASE_ORDER)
    if duration_minutes < phase_count:
        minutes = [1 if index < duration_minutes else 0 for index in range(phase_count)]
    else:
        total_share = sum(shares.values())
        raw = [shares[phase] / total_share * duration_minutes for phase in FOCUS_PHASE_ORDER]
        floors = [int(value) for value in raw]
        remainder = duration_minutes - sum(floors)
        order = sorted(range(phase_count), key=lambda index: raw[index] - floors[index], reverse=True)
        minutes = list(floors)
        for index in range(remainder):
            minutes[order[index]] += 1

    plan = []
    start = 0
    for phase, count in zip(FOCUS_PHASE_ORDER, minutes):
        plan.append(
            FocusPhaseRead(
                phase=phase,
                start_minute=start,
                end_minute=start + count,
                suggested_activity=FOCUS_PHASE_ACTIVITIES[phase],
            )
        )
        start += count
    return plan


def _current_phase(plan: list[FocusPhaseRead], elapsed_seconds: int) -> FocusPhaseRead | None:
    if not plan:
        return None
    minute = elapsed_seconds // 60
    for phase in plan:
        if phase.start_minute <= minute < phase.end_minute:
            return phase
    return plan[-1]


def _load_plan(session: FocusSession) -> list[FocusPhaseRead]:
    return [FocusPhaseRead(**entry) for entry in (session.plan or [])]


def _open_interruption(session: FocusSession):
    for interruption in session.interruptions:
        if interruption.visible_at is None:
            return interruption
    return None


def _public_student_id(db: Session, student_pk: int) -> str:
    student = db.get(Student, student_pk)
    return student.student_id if student is not None else f"S{student_pk:03d}"


def _valid_duration(duration_minutes: int) -> bool:
    return FOCUS_CUSTOM_DURATION_MIN_MINUTES <= duration_minutes <= FOCUS_CUSTOM_DURATION_MAX_MINUTES


def _coerce_now(now: dt.datetime | None) -> dt.datetime:
    return now if now is not None else dt.datetime.utcnow()


def _slugify(value: str) -> str:
    return " ".join(value.strip().casefold().split()).replace(" ", "-")
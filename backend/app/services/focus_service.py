"""Focus service layer for Phase 6 (single focus sessions + Pomodoro) and analytics.

The backend is the source of truth for time. Elapsed/remaining time is always
computed from the recorded `started_at`, the interruption records, and the
break records, using an injectable clock (`now=`). While a tab is hidden the
timer is paused, so a student is never penalized for stepping away. Break time
is recorded separately and never counts toward active study time. The frontend
never calculates time, XP, or completion.
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
    FOCUS_POMODORO_BREAK_MAX_MINUTES,
    FOCUS_POMODORO_BREAK_MIN_MINUTES,
    FOCUS_POMODORO_PRESETS,
    FOCUS_POMODORO_ROUNDS_MAX,
    FOCUS_POMODORO_ROUNDS_MIN,
    FOCUS_POMODORO_STUDY_MAX_MINUTES,
    FOCUS_POMODORO_STUDY_MIN_MINUTES,
)
from app.database.repositories.focus_repository import (
    add_interruption,
    create_focus_session,
    get_active_focus_session,
    get_focus_session,
    get_focus_sessions_for_student,
)
from app.database.repositories.student_repository import get_student_with_state
from app.engine.mastery import mastery_band_label
from app.models.focus_session import FocusSession
from app.models.student import Student
from app.schemas.focus import (
    FocusAnalyticsRead,
    FocusBreakResponse,
    FocusCompleteRequest,
    FocusCompleteResponse,
    FocusInterruptResponse,
    FocusPhaseRead,
    FocusRecentSessionRead,
    FocusResumeResponse,
    FocusSessionRead,
    FocusStartResponse,
    FocusTopicStatsRead,
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


class FocusBreakTransitionError(Exception):
    """Raised for an invalid break transition in a Pomodoro session."""


def start_focus_session(
    db: Session,
    *,
    student_id: str,
    topic: str | None,
    mode: str,
    duration_minutes: int | None = None,
    preset: str | None = None,
    study_minutes: int | None = None,
    break_minutes: int | None = None,
    rounds: int | None = None,
    now: dt.datetime | None = None,
) -> FocusStartResponse | None:
    started_at = _coerce_now(now)
    if mode not in ("single", "pomodoro"):
        raise ValueError(f"Unknown focus mode: {mode}")

    if mode == "single":
        if duration_minutes is None:
            raise ValueError("duration_minutes is required for single focus sessions")
        if not _valid_duration(duration_minutes):
            raise ValueError(
                "duration_minutes must be one of the preset durations "
                f"({', '.join(str(value) for value in (25, 45, 60))}) "
                f"or between {FOCUS_CUSTOM_DURATION_MIN_MINUTES} and {FOCUS_CUSTOM_DURATION_MAX_MINUTES}"
            )
        planned_minutes = duration_minutes
        study, break_, rnds = None, None, None
    else:
        study, break_, rnds = _resolve_pomodoro_config(preset, study_minutes, break_minutes, rounds)
        planned_minutes = study * rnds + break_ * (rnds - 1)

    student = get_student_with_state(db, student_id)
    if student is None or student.learning_state is None:
        return None
    if get_active_focus_session(db, student.id) is not None:
        raise FocusSessionActiveError()

    topic_slug = _slugify(topic) if topic else None
    mastery = float(
        (student.learning_state.concept_scores or {}).get(topic_slug, student.learning_state.mastery or 0.0)
    )
    if mode == "single":
        plan = _build_plan(duration_minutes, _phase_shares(mastery))
    else:
        plan = _build_pomodoro_plan(study, break_, rnds)
    session = create_focus_session(
        db,
        student_pk=student.id,
        topic=topic_slug,
        mode=mode,
        planned_minutes=planned_minutes,
        started_at=started_at,
        plan=[phase.model_dump() for phase in plan],
        study_minutes=study,
        break_minutes=break_,
        rounds=rnds,
    )
    return FocusStartResponse(
        session_id=session.id,
        topic=topic_slug,
        mode=session.mode,
        planned_minutes=session.planned_minutes,
        study_minutes=session.study_minutes if mode == "pomodoro" else None,
        break_minutes=session.break_minutes if mode == "pomodoro" else None,
        rounds=session.rounds if mode == "pomodoro" else None,
        started_at=session.started_at,
        plan=plan,
        remaining_seconds=planned_minutes * 60,
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
    plan = _load_plan(session)
    if session.mode == "pomodoro":
        active, _, remaining, segment, segment_remaining = _pomodoro_timings(session, clock)
        return FocusSessionRead(
            session_id=session.id,
            student_id=_public_student_id(db, session.student_id),
            topic=session.topic,
            mode=session.mode,
            planned_minutes=session.planned_minutes,
            study_minutes=session.study_minutes,
            break_minutes=session.break_minutes,
            rounds=session.rounds,
            status=session.status,
            started_at=session.started_at,
            ended_at=session.ended_at,
            elapsed_seconds=active,
            remaining_seconds=remaining,
            active_seconds=session.active_seconds,
            break_seconds=session.break_seconds,
            interruption_count=session.interruption_count,
            current_round=session.current_round,
            questions_attempted=session.questions_attempted,
            concepts_studied=list(session.concepts_studied or []),
            plan=plan,
            current_phase=_pomodoro_current_phase(session, clock),
            segment=segment,
            segment_remaining_seconds=segment_remaining,
            message=MESSAGE_EXPIRED if expired else None,
        )

    elapsed, remaining = _elapsed_and_remaining(session, clock)
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
        segment="study",
        segment_remaining_seconds=remaining,
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
    remaining = _remaining_seconds(session, clock)
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
    remaining = _remaining_seconds(session, clock)
    message = f"Welcome back! You have {math.ceil(remaining / 60)} minutes remaining."
    return FocusResumeResponse(
        session_id=session.id,
        message=message,
        remaining_seconds=remaining,
        status=session.status,
    )


def start_focus_break(
    db: Session,
    session_id: int,
    now: dt.datetime | None = None,
) -> FocusBreakResponse | None:
    """Begin the scheduled break after the current study round (Pomodoro only)."""
    session = get_focus_session(db, session_id)
    if session is None:
        return None
    clock = _coerce_now(now)
    _apply_expiry(db, session, clock)
    if session.mode != "pomodoro":
        raise ValueError("Break controls only apply to Pomodoro sessions")
    if session.status == "on_break":
        raise FocusBreakTransitionError("Break already started")
    if session.status not in ("active",):
        raise FocusSessionEndedError()
    if session.current_round >= session.rounds:
        raise FocusBreakTransitionError("No break remaining in this session")
    session.status = "on_break"
    session.segment_started_at = clock
    db.add(session)
    db.commit()
    db.refresh(session)
    _, _, remaining, _, segment_remaining = _pomodoro_timings(session, clock)
    return FocusBreakResponse(
        session_id=session.id,
        status=session.status,
        message="Break started.",
        remaining_seconds=remaining,
        segment_remaining_seconds=segment_remaining,
        current_round=session.current_round,
    )


def end_focus_break(
    db: Session,
    session_id: int,
    now: dt.datetime | None = None,
) -> FocusBreakResponse | None:
    """Finish the current break and return to studying the next round (Pomodoro only)."""
    session = get_focus_session(db, session_id)
    if session is None:
        return None
    clock = _coerce_now(now)
    _apply_expiry(db, session, clock)
    if session.mode != "pomodoro":
        raise ValueError("Break controls only apply to Pomodoro sessions")
    if session.status == "on_break":
        break_elapsed = max(0, int((clock - (session.segment_started_at or session.started_at)).total_seconds()))
        session.break_seconds += break_elapsed
        session.current_round += 1
        session.status = "active"
        session.segment_started_at = clock
        db.add(session)
        db.commit()
        db.refresh(session)
        _, _, remaining, _, segment_remaining = _pomodoro_timings(session, clock)
        return FocusBreakResponse(
            session_id=session.id,
            status=session.status,
            message=f"Break over. Back to round {session.current_round}.",
            remaining_seconds=remaining,
            segment_remaining_seconds=segment_remaining,
            current_round=session.current_round,
        )
    if session.status not in ("active",):
        raise FocusSessionEndedError()
    raise FocusBreakTransitionError("Break not started")


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

    if session.mode == "pomodoro":
        active_seconds = _pomodoro_timings(session, clock)[0]
        # Fold any partial break into the recorded break time before ending.
        if session.status == "on_break" and session.segment_started_at is not None:
            session.break_seconds += max(0, int((clock - session.segment_started_at).total_seconds()))
        study_total_seconds = session.study_minutes * session.rounds * 60
        completed = active_seconds >= int(study_total_seconds * FOCUS_COMPLETION_THRESHOLD)
    else:
        active_seconds = _elapsed_seconds(session, clock)
        threshold_seconds = int(session.planned_minutes * 60 * FOCUS_COMPLETION_THRESHOLD)
        completed = active_seconds >= threshold_seconds

    session.active_seconds = active_seconds
    session.ended_at = clock
    if payload.questions_attempted is not None:
        session.questions_attempted = payload.questions_attempted
    if payload.concepts_studied is not None:
        session.concepts_studied = payload.concepts_studied
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


def get_focus_analytics(
    db: Session,
    student_id: str,
    *,
    limit: int = 10,
) -> FocusAnalyticsRead | None:
    """Aggregate focus history for a student (durations and counts only)."""
    student = get_student_with_state(db, student_id)
    if student is None:
        return None
    sessions = get_focus_sessions_for_student(db, student.id)
    total = len(sessions)

    completed_count = sum(1 for session in sessions if session.status == "completed")
    abandoned_count = sum(1 for session in sessions if session.status == "abandoned")

    total_active_seconds = sum(session.active_seconds for session in sessions)
    total_active_minutes = round(total_active_seconds / 60) if total else 0
    avg_planned_minutes = round(sum(session.planned_minutes for session in sessions) / total, 1) if total else 0.0
    avg_active_minutes = round(sum(session.active_seconds for session in sessions) / total / 60, 1) if total else 0.0
    avg_interruptions = (
        round(sum(session.interruption_count for session in sessions) / total, 1) if total else 0.0
    )

    topic_minutes: dict[str, int] = {}
    for session in sessions:
        if session.topic:
            topic_minutes[session.topic] = topic_minutes.get(session.topic, 0) + round(session.active_seconds / 60)
    topics_studied = [
        FocusTopicStatsRead(topic=topic, active_minutes=minutes)
        for topic, minutes in sorted(topic_minutes.items(), key=lambda item: (-item[1], item[0]))
    ]

    recent_sessions = [
        FocusRecentSessionRead(
            id=session.id,
            topic=session.topic,
            mode=session.mode,
            planned_minutes=session.planned_minutes,
            active_seconds=session.active_seconds,
            interruption_count=session.interruption_count,
            status=session.status,
            started_at=session.started_at,
        )
        for session in sessions[:limit]
    ]
    return FocusAnalyticsRead(
        student_id=student.student_id,
        total_sessions=total,
        completed_count=completed_count,
        abandoned_count=abandoned_count,
        total_active_minutes=total_active_minutes,
        avg_planned_minutes=avg_planned_minutes,
        avg_active_minutes=avg_active_minutes,
        avg_interruptions_per_session=avg_interruptions,
        topics_studied=topics_studied,
        recent_sessions=recent_sessions,
    )


def _resolve_pomodoro_config(
    preset: str | None,
    study_minutes: int | None,
    break_minutes: int | None,
    rounds: int | None,
) -> tuple[int, int, int]:
    if preset is not None:
        config = FOCUS_POMODORO_PRESETS.get(preset)
        if config is None:
            raise ValueError(f"Unknown pomodoro preset: {preset}")
        study_minutes, break_minutes = config["study_minutes"], config["break_minutes"]
    if study_minutes is None or break_minutes is None:
        raise ValueError("study_minutes and break_minutes are required for pomodoro sessions")
    rnds = rounds if rounds is not None else 1
    if not (FOCUS_POMODORO_STUDY_MIN_MINUTES <= study_minutes <= FOCUS_POMODORO_STUDY_MAX_MINUTES):
        raise ValueError(
            f"study_minutes must be between {FOCUS_POMODORO_STUDY_MIN_MINUTES} "
            f"and {FOCUS_POMODORO_STUDY_MAX_MINUTES}"
        )
    if not (FOCUS_POMODORO_BREAK_MIN_MINUTES <= break_minutes <= FOCUS_POMODORO_BREAK_MAX_MINUTES):
        raise ValueError(
            f"break_minutes must be between {FOCUS_POMODORO_BREAK_MIN_MINUTES} "
            f"and {FOCUS_POMODORO_BREAK_MAX_MINUTES}"
        )
    if not (FOCUS_POMODORO_ROUNDS_MIN <= rnds <= FOCUS_POMODORO_ROUNDS_MAX):
        raise ValueError(f"rounds must be between {FOCUS_POMODORO_ROUNDS_MIN} and {FOCUS_POMODORO_ROUNDS_MAX}")
    return study_minutes, break_minutes, rnds


def _build_pomodoro_plan(study_minutes: int, break_minutes: int, rounds: int) -> list[FocusPhaseRead]:
    """The full cycle: study, break, study, break, ..., study. No trailing break."""
    plan = []
    start = 0
    for round_number in range(1, rounds + 1):
        plan.append(
            FocusPhaseRead(
                phase="study",
                start_minute=start,
                end_minute=start + study_minutes,
                suggested_activity="focus",
            )
        )
        start += study_minutes
        if round_number < rounds:
            plan.append(
                FocusPhaseRead(
                    phase="break",
                    start_minute=start,
                    end_minute=start + break_minutes,
                    suggested_activity="rest",
                )
            )
            start += break_minutes
    return plan


def _apply_expiry(db: Session, session: FocusSession, now: dt.datetime) -> bool:
    """Mark an overrun, never-completed session abandoned when it is read.

    The whole planned session (including breaks for Pomodoro) is used as the
    expiry window.
    """
    if session.status not in ("active", "on_break"):
        return False
    planned_end = session.started_at + dt.timedelta(minutes=session.planned_minutes)
    grace = dt.timedelta(minutes=FOCUS_ABANDON_GRACE_MINUTES)
    if now <= planned_end + grace:
        return False
    active = (
        _pomodoro_timings(session, now)[0]
        if session.mode == "pomodoro"
        else _elapsed_seconds(session, now)
    )
    session.status = "abandoned"
    session.ended_at = now
    session.active_seconds = active
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


def _remaining_seconds(session: FocusSession, now: dt.datetime) -> int:
    if session.mode == "pomodoro":
        return _pomodoro_timings(session, now)[2]
    _, remaining = _elapsed_and_remaining(session, now)
    return remaining


def _pomodoro_timings(session: FocusSession, now: dt.datetime) -> tuple[int, int, int, str, int]:
    """Return (active_seconds, break_elapsed_seconds, remaining_whole_seconds,
    segment, segment_remaining_seconds) for a Pomodoro session."""
    clock_end = session.ended_at if session.ended_at is not None else now
    wall = max(0, int((clock_end - session.started_at).total_seconds()))
    away = sum(interruption.seconds_away for interruption in session.interruptions)

    break_elapsed = session.break_seconds
    break_partial = 0
    if session.status == "on_break" and session.segment_started_at is not None:
        break_partial = max(0, int((clock_end - session.segment_started_at).total_seconds()))
    break_elapsed += break_partial

    active = max(0, wall - away - break_elapsed)
    total_planned = (session.study_minutes * session.rounds + session.break_minutes * (session.rounds - 1)) * 60
    remaining = max(0, total_planned - active - break_elapsed)

    if session.status == "on_break":
        segment = "break"
        segment_remaining = max(0, session.break_minutes * 60 - break_partial)
    else:
        segment = "study"
        segment_start = session.segment_started_at or session.started_at
        seg_wall = max(0, int((clock_end - segment_start).total_seconds()))
        seg_away = sum(
            interruption.seconds_away
            for interruption in session.interruptions
            if interruption.visible_at is not None and interruption.hidden_at >= segment_start
        )
        segment_remaining = max(0, session.study_minutes * 60 - max(0, seg_wall - seg_away))
    return active, break_elapsed, remaining, segment, segment_remaining


def _pomodoro_current_phase(session: FocusSession, clock: dt.datetime) -> FocusPhaseRead:
    segment_start = session.segment_started_at or session.started_at
    start_minute = max(0, int((segment_start - session.started_at).total_seconds()) // 60)
    if session.status == "on_break":
        length, phase, activity = session.break_minutes, "break", "rest"
    else:
        length, phase, activity = session.study_minutes, "study", "focus"
    return FocusPhaseRead(
        phase=phase,
        start_minute=start_minute,
        end_minute=start_minute + length,
        suggested_activity=activity,
    )


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
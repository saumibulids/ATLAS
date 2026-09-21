"""Tests for Phase 6a focus sessions."""

import datetime as dt

import pytest
from sqlalchemy import select

from app.core.constants import FOCUS_COMPLETION_THRESHOLD, GAMIFICATION_XP_ACTIONS
from app.database.database import SessionLocal
from app.database.repositories.focus_repository import get_focus_session
from app.database.repositories.student_repository import get_student_with_state
from app.models.gamification import StudentXP
from app.schemas.focus import FocusCompleteRequest
from app.services.focus_service import (
    FocusSessionActiveError,
    FocusSessionEndedError,
    complete_focus_session,
    get_focus_session_state,
    interrupt_focus_session,
    resume_focus_session,
    start_focus_session,
)

T0 = dt.datetime(2026, 9, 21, 6, 0, 0)

START_PAYLOAD = {
    "student_id": "S001",
    "topic": "routing",
    "mode": "single",
    "duration_minutes": 45,
}


def _start(student_id: str = "S001", topic: str = "routing", duration: int = 45, now: dt.datetime = T0):
    db = SessionLocal()
    try:
        return start_focus_session(
            db,
            student_id=student_id,
            topic=topic,
            mode="single",
            duration_minutes=duration,
            now=now,
        )
    finally:
        db.close()


def _set_topic_score(db, topic_slug: str, score: float) -> None:
    student = get_student_with_state(db, "S001")
    state = student.learning_state
    scores = dict(state.concept_scores or {})
    scores[topic_slug] = score
    state.concept_scores = scores
    state.mastery = score
    db.add(state)
    db.commit()


def _focus_xp_events(db):
    return db.scalars(
        select(StudentXP).where(StudentXP.action == "focus_session_completed", StudentXP.topic == "routing")
    ).all()


def test_plan_phases_add_up_to_duration():
    db = SessionLocal()
    try:
        for duration in (5, 25, 45, 60, 90, 180):
            result = _start(duration=duration)
            assert result is not None
            plan = result.plan
            assert plan[0].start_minute == 0
            assert plan[-1].end_minute == duration
            assert [phase.phase for phase in plan] == [
                "quick_revision",
                "learn",
                "practice",
                "notes_revision",
                "mini_assessment",
                "reflection",
            ]
            assert all(
                next_phase.start_minute == phase.end_minute for phase, next_phase in zip(plan, plan[1:])
            )
            assert sum(phase.end_minute - phase.start_minute for phase in plan) == duration
            complete_focus_session(db, result.session_id, FocusCompleteRequest(), now=T0)
    finally:
        db.close()

    # The 45-minute plan matches the spec section 20 split exactly.
    plan = _start(duration=45).plan
    assert [(phase.start_minute, phase.end_minute, phase.suggested_activity) for phase in plan] == [
        (0, 5, "flashcards"),
        (5, 20, "notes"),
        (20, 30, "practice"),
        (30, 38, "notes"),
        (38, 43, "practice"),
        (43, 45, "notes"),
    ]


def test_low_vs_high_mastery_changes_plan():
    db = SessionLocal()
    try:
        _set_topic_score(db, "routing", 0.15)
        low = start_focus_session(
            db, student_id="S001", topic="routing", mode="single", duration_minutes=45, now=T0
        )
        assert low is not None
        complete_focus_session(db, low.session_id, FocusCompleteRequest(), now=T0)

        _set_topic_score(db, "routing", 0.85)
        high = start_focus_session(
            db, student_id="S001", topic="routing", mode="single", duration_minutes=45, now=T0
        )
        assert high is not None

        def minutes_for(plan, phase):
            return next(entry.end_minute - entry.start_minute for entry in plan if entry.phase == phase)

        learn_high, learn_low = minutes_for(high.plan, "learn"), minutes_for(low.plan, "learn")
        practice_high, practice_low = minutes_for(high.plan, "practice"), minutes_for(low.plan, "practice")
        assert learn_low > learn_high
        assert practice_high > practice_low
    finally:
        db.close()


def test_interrupt_then_resume_records_seconds_away():
    result = _start(duration=45)
    db = SessionLocal()
    try:
        interrupted = interrupt_focus_session(db, result.session_id, now=T0 + dt.timedelta(minutes=10))
        assert interrupted.remaining_seconds == 35 * 60

        resumed = resume_focus_session(db, result.session_id, now=T0 + dt.timedelta(minutes=17))
        # Timer is paused while the tab is hidden, so remaining time is preserved.
        assert resumed.remaining_seconds == 35 * 60
        assert "You have 35 minutes remaining." in resumed.message

        session = get_focus_session(db, result.session_id)
        assert session is not None
        assert session.interruption_count == 1
        assert len(session.interruptions) == 1
        interruption = session.interruptions[0]
        assert interruption.seconds_away == 7 * 60
        assert interruption.visible_at is not None
    finally:
        db.close()


def test_remaining_seconds_comes_from_controllable_clock():
    result = _start(duration=25)
    db = SessionLocal()
    try:
        at_5 = get_focus_session_state(db, result.session_id, now=T0 + dt.timedelta(minutes=5))
        assert at_5.remaining_seconds == 20 * 60
        assert at_5.elapsed_seconds == 5 * 60
        assert at_5.status == "active"
        assert at_5.current_phase is not None

        at_15 = get_focus_session_state(db, result.session_id, now=T0 + dt.timedelta(minutes=15))
        assert at_15.remaining_seconds == 10 * 60
        assert at_15.elapsed_seconds == 15 * 60
    finally:
        db.close()


def test_complete_above_and_below_threshold():
    threshold = 45 * 60 * FOCUS_COMPLETION_THRESHOLD
    db = SessionLocal()
    try:
        above = start_focus_session(
            db, student_id="S001", topic="routing", mode="single", duration_minutes=45, now=T0
        )
        assert above is not None
        result = complete_focus_session(
            db,
            above.session_id,
            FocusCompleteRequest(questions_attempted=6, concepts_studied=["routing-table"]),
            now=T0 + dt.timedelta(minutes=40),
        )
        assert result.status == "completed"
        assert result.active_seconds == 40 * 60
        assert result.active_seconds >= threshold
        assert result.gamification is not None
        stored = get_focus_session(db, above.session_id)
        assert stored.questions_attempted == 6
        assert stored.concepts_studied == ["routing-table"]

        below = start_focus_session(
            db, student_id="S001", topic="routing", mode="single", duration_minutes=45, now=T0
        )
        assert below is not None
        result = complete_focus_session(db, below.session_id, FocusCompleteRequest(), now=T0 + dt.timedelta(minutes=20))
        assert result.status == "abandoned"
        assert result.active_seconds == 20 * 60
        assert result.active_seconds < threshold
        assert result.gamification is None
        assert "completion threshold" in result.message.lower()
    finally:
        db.close()


def test_second_concurrent_start_returns_409(client):
    first = client.post("/api/focus/start", json=START_PAYLOAD)
    assert first.status_code == 201
    second = client.post("/api/focus/start", json=START_PAYLOAD)
    assert second.status_code == 409
    assert "already running" in second.json()["detail"]

    # Completing (here abandoning, active time far below the threshold) frees the student.
    session_id = first.json()["session_id"]
    completed = client.post(f"/api/focus/{session_id}/complete", json={})
    assert completed.status_code == 200
    assert completed.json()["status"] == "abandoned"
    third = client.post("/api/focus/start", json=START_PAYLOAD)
    assert third.status_code == 201


def test_start_while_active_raises_service_error():
    db = SessionLocal()
    try:
        start_focus_session(db, student_id="S001", topic="routing", mode="single", duration_minutes=25, now=T0)
        with pytest.raises(FocusSessionActiveError):
            start_focus_session(db, student_id="S001", topic="routing", mode="single", duration_minutes=25, now=T0)
    finally:
        db.close()


def test_auto_abandon_after_expiry():
    result = _start(duration=25)
    db = SessionLocal()
    try:
        session = get_focus_session(db, result.session_id)
        state = get_focus_session_state(db, result.session_id, now=T0 + dt.timedelta(minutes=40))
        assert state.status == "abandoned"
        assert state.message is not None
        db.refresh(session)
        assert session.status == "abandoned"
        assert session.ended_at is not None
    finally:
        db.close()


def test_gamification_xp_awarded_once_on_complete():
    result = _start(duration=25)
    db = SessionLocal()
    try:
        completed = complete_focus_session(
            db, result.session_id, FocusCompleteRequest(), now=T0 + dt.timedelta(minutes=25)
        )
        assert completed.status == "completed"
        assert completed.gamification is not None
        assert completed.gamification.xp_awarded == GAMIFICATION_XP_ACTIONS["focus_session_completed"]
        assert len(_focus_xp_events(db)) == 1

        with pytest.raises(FocusSessionEndedError):
            complete_focus_session(db, result.session_id, FocusCompleteRequest(), now=T0 + dt.timedelta(minutes=26))
        assert len(_focus_xp_events(db)) == 1

        # Abandoned sessions never award XP.
        other = start_focus_session(
            db, student_id="S001", topic="routing", mode="single", duration_minutes=25, now=T0
        )
        assert other is not None
        abandoned = complete_focus_session(db, other.session_id, FocusCompleteRequest(), now=T0 + dt.timedelta(minutes=5))
        assert abandoned.status == "abandoned"
        assert abandoned.gamification is None
        assert len(_focus_xp_events(db)) == 1
    finally:
        db.close()


def test_start_endpoint_returns_plan(client):
    response = client.post(
        "/api/focus/start",
        json={
            "student_id": "S001",
            "topic": "routing",
            "mode": "single",
            "duration_minutes": 25,
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "active"
    assert body["remaining_seconds"] == 25 * 60
    assert body["plan"][0]["phase"] == "quick_revision"
    assert sum(entry["end_minute"] - entry["start_minute"] for entry in body["plan"]) == 25


def test_get_state_endpoint_and_current_phase(client):
    started = client.post("/api/focus/start", json=START_PAYLOAD).json()
    state = client.get(f"/api/focus/{started['session_id']}").json()
    assert state["status"] == "active"
    assert state["current_phase"]["phase"] == "quick_revision"
    assert state["remaining_seconds"] > 0
    assert client.get("/api/focus/999999").status_code == 404


def test_interrupt_resume_complete_endpoints(client):
    started = client.post("/api/focus/start", json=START_PAYLOAD).json()
    session_id = started["session_id"]
    interrupted = client.post(f"/api/focus/{session_id}/interrupt")
    assert interrupted.status_code == 200
    assert "stepped away" in interrupted.json()["message"]
    resumed = client.post(f"/api/focus/{session_id}/resume")
    assert resumed.status_code == 200
    assert resumed.json()["message"].startswith("Welcome back!")
    completed = client.post(f"/api/focus/{session_id}/complete", json={"questions_attempted": 4})
    assert completed.status_code == 200
    assert completed.json()["status"] == "abandoned"
    # Acting on an ended session returns 409.
    assert client.post(f"/api/focus/{session_id}/interrupt").status_code == 409


def test_start_validation(client):
    response = client.post(
        "/api/focus/start",
        json={"student_id": "S001", "topic": "routing", "mode": "single", "duration_minutes": 500},
    )
    assert response.status_code == 422
    pomodoro = client.post(
        "/api/focus/start",
        json={"student_id": "S001", "topic": "routing", "mode": "pomodoro", "duration_minutes": 45},
    )
    assert pomodoro.status_code == 400
    # A preset must be known.
    unknown = client.post(
        "/api/focus/start",
        json={"student_id": "S001", "topic": "routing", "mode": "pomodoro", "preset": "99/99"},
    )
    assert unknown.status_code == 400
    # Preset plus explicit rounds is valid.
    valid = client.post(
        "/api/focus/start",
        json={"student_id": "S001", "topic": "routing", "mode": "pomodoro", "preset": "25/5", "rounds": 2},
    )
    assert valid.status_code == 201
    body = valid.json()
    assert body["mode"] == "pomodoro"
    assert body["study_minutes"] == 25
    assert body["break_minutes"] == 5
    assert body["rounds"] == 2
    assert sum(entry["end_minute"] - entry["start_minute"] for entry in body["plan"]) == 25 * 2 + 5
    missing = client.post(
        "/api/focus/start",
        json={"student_id": "NOPE", "topic": "routing", "mode": "single", "duration_minutes": 45},
    )
    assert missing.status_code == 404
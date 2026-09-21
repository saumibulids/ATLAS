"""Tests for Phase 6b Pomodoro focus sessions and focus analytics."""

import datetime as dt

import pytest
from sqlalchemy import select

from app.core.constants import FOCUS_COMPLETION_THRESHOLD, GAMIFICATION_XP_ACTIONS
from app.database.database import SessionLocal
from app.database.repositories.focus_repository import get_focus_session
from app.models.gamification import StudentXP
from app.schemas.focus import FocusCompleteRequest
from app.services.focus_service import (
    FocusSessionEndedError,
    complete_focus_session,
    end_focus_break,
    get_focus_session_state,
    start_focus_break,
    start_focus_session,
)

T0 = dt.datetime(2026, 9, 21, 6, 0, 0)


def _start_pomodoro(
    *,
    study_minutes: int = 40,
    break_minutes: int = 10,
    rounds: int = 3,
    preset: str | None = None,
    now: dt.datetime = T0,
):
    db = SessionLocal()
    try:
        return start_focus_session(
            db,
            student_id="S001",
            topic="routing",
            mode="pomodoro",
            study_minutes=study_minutes,
            break_minutes=break_minutes,
            rounds=rounds,
            preset=preset,
            now=now,
        )
    finally:
        db.close()


def test_pomodoro_schedule_has_3_study_segments_and_2_breaks():
    db = SessionLocal()
    try:
        result = _start_pomodoro()
        assert result is not None
        plan = result.plan
        assert [phase.phase for phase in plan] == ["study", "break", "study", "break", "study"]
        assert [(phase.start_minute, phase.end_minute) for phase in plan] == [
            (0, 40),
            (40, 50),
            (50, 90),
            (90, 100),
            (100, 140),
        ]
        assert sum(phase.end_minute - phase.start_minute for phase in plan) == 140
        assert result.planned_minutes == 140
        assert result.remaining_seconds == 140 * 60
    finally:
        db.close()


def test_pomodoro_presets_resolve():
    db = SessionLocal()
    try:
        result = start_focus_session(
            db,
            student_id="S001",
            topic="routing",
            mode="pomodoro",
            preset="25/5",
            rounds=3,
            now=T0,
        )
        assert result is not None
        assert (result.study_minutes, result.break_minutes, result.rounds) == (25, 5, 3)
        assert result.planned_minutes == 25 * 3 + 5 * 2

        complete_focus_session(db, result.session_id, FocusCompleteRequest(), now=T0)
        result = start_focus_session(
            db,
            student_id="S001",
            topic="routing",
            mode="pomodoro",
            preset="45/10",
            rounds=1,
            now=T0,
        )
        assert result is not None
        assert (result.study_minutes, result.break_minutes, result.rounds) == (45, 10, 1)
        assert result.planned_minutes == 45
        assert [phase.phase for phase in result.plan] == ["study"]  # no trailing break
    finally:
        db.close()


def test_pomodoro_round_and_segment_from_controlled_clock():
    result = _start_pomodoro()
    assert result is not None
    db = SessionLocal()
    try:
        early = get_focus_session_state(db, result.session_id, now=T0 + dt.timedelta(minutes=20))
        assert early.status == "active"
        assert early.current_round == 1
        assert early.segment == "study"
        assert early.segment_remaining_seconds == 20 * 60
        assert early.remaining_seconds == (140 - 20) * 60

        started = start_focus_break(db, result.session_id, now=T0 + dt.timedelta(minutes=40))
        assert started.status == "on_break"
        assert started.current_round == 1
        assert started.segment_remaining_seconds == 10 * 60

        mid_break = get_focus_session_state(db, result.session_id, now=T0 + dt.timedelta(minutes=45))
        assert mid_break.status == "on_break"
        assert mid_break.current_round == 1
        assert mid_break.segment == "break"
        assert mid_break.segment_remaining_seconds == 5 * 60
        assert mid_break.remaining_seconds == (140 - 40 - 5) * 60
    finally:
        db.close()


def test_break_time_excluded_from_active_time():
    result = _start_pomodoro(rounds=2)
    assert result is not None
    db = SessionLocal()
    try:
        start_focus_break(db, result.session_id, now=T0 + dt.timedelta(minutes=40))
        end_focus_break(db, result.session_id, now=T0 + dt.timedelta(minutes=50))
        session = get_focus_session(db, result.session_id)
        assert session.break_seconds == 10 * 60

        state = get_focus_session_state(db, result.session_id, now=T0 + dt.timedelta(minutes=50))
        assert state.status == "active"
        assert state.current_round == 2
        assert state.elapsed_seconds == 40 * 60  # break time never counts as active
        assert state.segment == "study"
        assert state.segment_remaining_seconds == 40 * 60
        assert state.remaining_seconds == 40 * 60
    finally:
        db.close()


def test_invalid_break_transitions(client):
    started = client.post(
        "/api/focus/start",
        json={
            "student_id": "S001",
            "topic": "routing",
            "mode": "pomodoro",
            "preset": "25/5",
            "rounds": 2,
        },
    )
    assert started.status_code == 201
    session_id = started.json()["session_id"]

    # Ending a break that never started is a 409.
    assert client.post(f"/api/focus/{session_id}/break/end").status_code == 409
    # Starting a break while already on break is a 409.
    assert client.post(f"/api/focus/{session_id}/break/start").status_code == 200
    assert client.post(f"/api/focus/{session_id}/break/start").status_code == 409
    # Back to studying: still one break left.
    assert client.post(f"/api/focus/{session_id}/break/end").status_code == 200
    # In the final round there is no trailing break.
    assert client.post(f"/api/focus/{session_id}/break/start").status_code == 409

    # Complete the Pomodoro (it abandons early) so the student is free again.
    assert client.post(f"/api/focus/{session_id}/complete", json={}).status_code == 200

    # Single-mode sessions do not support breaks (400).
    single = client.post(
        "/api/focus/start",
        json={"student_id": "S001", "topic": "routing", "mode": "single", "duration_minutes": 25},
    )
    assert single.status_code == 201
    assert client.post(f"/api/focus/{single.json()['session_id']}/break/start").status_code == 400
    assert client.post(f"/api/focus/{single.json()['session_id']}/break/end").status_code == 400


def test_pomodoro_complete_after_all_rounds_awards_xp_once():
    result = _start_pomodoro(study_minutes=25, break_minutes=5, rounds=2)
    assert result is not None
    db = SessionLocal()
    try:
        start_focus_break(db, result.session_id, now=T0 + dt.timedelta(minutes=25))
        end_focus_break(db, result.session_id, now=T0 + dt.timedelta(minutes=30))
        completed = complete_focus_session(
            db, result.session_id, FocusCompleteRequest(), now=T0 + dt.timedelta(minutes=55)
        )
        assert completed.status == "completed"
        assert completed.active_seconds == 50 * 60
        assert completed.gamification is not None
        assert completed.gamification.xp_awarded == GAMIFICATION_XP_ACTIONS["focus_session_completed"]

        events = db.scalars(
            select(StudentXP).where(StudentXP.action == "focus_session_completed", StudentXP.topic == "routing")
        ).all()
        assert len(events) == 1

        with pytest.raises(FocusSessionEndedError):
            complete_focus_session(db, result.session_id, FocusCompleteRequest(), now=T0 + dt.timedelta(minutes=56))
        assert len(events) == 1
    finally:
        db.close()


def test_pomodoro_completion_threshold_on_planned_study_time():
    result = _start_pomodoro(study_minutes=25, break_minutes=5, rounds=2)
    assert result is not None
    db = SessionLocal()
    try:
        # 33 minutes of study (66% of the 50 planned study minutes) is below
        # the 80% threshold even though it is 60% of the whole session clock.
        abandoned = complete_focus_session(
            db, result.session_id, FocusCompleteRequest(), now=T0 + dt.timedelta(minutes=33)
        )
        assert abandoned.status == "abandoned"
        assert abandoned.active_seconds == 33 * 60
        assert abandoned.gamification is None
    finally:
        db.close()


def test_pomodoro_complete_while_on_break_folds_partial_break():
    result = _start_pomodoro(rounds=2)
    assert result is not None
    db = SessionLocal()
    try:
        start_focus_break(db, result.session_id, now=T0 + dt.timedelta(minutes=40))
        completed = complete_focus_session(
            db, result.session_id, FocusCompleteRequest(), now=T0 + dt.timedelta(minutes=45)
        )
        assert completed.status == "abandoned"
        # The 5-minute partial break is recorded and never counts as active.
        assert completed.active_seconds == 40 * 60
        session = get_focus_session(db, result.session_id)
        assert session.break_seconds == 5 * 60
        assert session.active_seconds == 40 * 60
    finally:
        db.close()


def test_pomodoro_auto_abandon_includes_break_time():
    result = _start_pomodoro(study_minutes=25, break_minutes=5, rounds=2)
    assert result is not None
    db = SessionLocal()
    try:
        # Planned total is 55 minutes (study 50 + break 5), so expiry lands at
        # T0 + 65 with the 10-minute grace. At T0 + 62 the session is still
        # alive even though 62 > 50 (study-only) — break time counts.
        alive = get_focus_session_state(db, result.session_id, now=T0 + dt.timedelta(minutes=62))
        assert alive.status == "active"

        expired = get_focus_session_state(db, result.session_id, now=T0 + dt.timedelta(minutes=70))
        assert expired.status == "abandoned"
        assert expired.message is not None
    finally:
        db.close()


def test_focus_analytics_totals_and_averages(client):
    db = SessionLocal()
    try:
        # A: single 45, completed with 40 active minutes, 2 interruptions.
        a = start_focus_session(db, student_id="S001", topic="routing", mode="single", duration_minutes=45, now=T0)
        assert a is not None
        complete_focus_session(db, a.session_id, FocusCompleteRequest(), now=T0 + dt.timedelta(minutes=40))
        session_a = get_focus_session(db, a.session_id)
        session_a.interruption_count = 2
        db.add(session_a)
        db.commit()

        # B: pomodoro 45/10 x1 (no breaks), completed, 2 interruptions.
        b = start_focus_session(
            db,
            student_id="S001",
            topic="routing",
            mode="pomodoro",
            study_minutes=45,
            break_minutes=10,
            rounds=1,
            now=T0 + dt.timedelta(hours=2),
        )
        assert b is not None
        complete_focus_session(
            db, b.session_id, FocusCompleteRequest(), now=T0 + dt.timedelta(hours=2, minutes=40)
        )
        session_b = get_focus_session(db, b.session_id)
        session_b.interruption_count = 2
        db.add(session_b)
        db.commit()

        # C: single 25, abandoned (10 active minutes), no interruptions.
        c = start_focus_session(
            db,
            student_id="S001",
            topic="ipv4_addressing",
            mode="single",
            duration_minutes=25,
            now=T0 + dt.timedelta(hours=4),
        )
        assert c is not None
        complete_focus_session(
            db, c.session_id, FocusCompleteRequest(), now=T0 + dt.timedelta(hours=4, minutes=10)
        )

        # D: single 45, abandoned (30 active minutes), no interruptions.
        d = start_focus_session(
            db,
            student_id="S001",
            topic="routing",
            mode="single",
            duration_minutes=45,
            now=T0 + dt.timedelta(hours=6),
        )
        assert d is not None
        complete_focus_session(
            db, d.session_id, FocusCompleteRequest(), now=T0 + dt.timedelta(hours=6, minutes=30)
        )
    finally:
        db.close()

    response = client.get("/api/students/S001/focus/analytics")
    assert response.status_code == 200
    body = response.json()
    assert body["total_sessions"] == 4
    assert body["completed_count"] == 2
    assert body["abandoned_count"] == 2
    assert body["total_active_minutes"] == 120
    assert body["avg_planned_minutes"] == 40.0
    assert body["avg_active_minutes"] == 30.0
    assert body["avg_interruptions_per_session"] == 1.0
    assert body["topics_studied"] == [
        {"topic": "routing", "active_minutes": 110},
        {"topic": "ipv4_addressing", "active_minutes": 10},
    ]

    recent = body["recent_sessions"]
    assert [entry["id"] for entry in recent] == [d.session_id, c.session_id, b.session_id, a.session_id]
    latest = recent[0]
    assert latest["topic"] == "routing"
    assert latest["mode"] == "single"
    assert latest["planned_minutes"] == 45
    assert latest["active_seconds"] == 1800
    assert latest["interruption_count"] == 0
    assert latest["status"] == "abandoned"
    assert "started_at" in latest


def test_focus_analytics_empty_student_returns_zeros(client):
    response = client.get("/api/students/S001/focus/analytics")
    assert response.status_code == 200
    body = response.json()
    assert body["total_sessions"] == 0
    assert body["completed_count"] == 0
    assert body["abandoned_count"] == 0
    assert body["total_active_minutes"] == 0
    assert body["avg_planned_minutes"] == 0.0
    assert body["avg_active_minutes"] == 0.0
    assert body["avg_interruptions_per_session"] == 0.0
    assert body["topics_studied"] == []
    assert body["recent_sessions"] == []
    assert client.get("/api/students/NOPE/focus/analytics").status_code == 404
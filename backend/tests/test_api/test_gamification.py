"""Tests for Phase 5 gamification."""

from datetime import timedelta

from app.core.constants import GAMIFICATION_DAILY_XP_CAPS, GAMIFICATION_XP_ACTIONS
from app.database.database import SessionLocal
from app.database.repositories.assessment_repository import get_questions_by_ids
from app.database.repositories.student_repository import get_student_with_state
from app.models.gamification import Streak
from app.services.gamification_service import award, award_focus_session
from scripts.seed_questions import seed_questions


def test_daily_cap_stops_farming():
    db = SessionLocal()
    try:
        awards = [award(db, "S001", "notes_completed", topic="routing") for _ in range(6)]
        assert sum(result.xp_awarded for result in awards) == GAMIFICATION_DAILY_XP_CAPS["notes_completed"]
        assert awards[-1].xp_awarded == 0
        assert awards[-1].reason == "Daily XP cap reached for this action"
    finally:
        db.close()


def test_level_up_triggers_at_threshold():
    db = SessionLocal()
    try:
        result = None
        for _ in range(5):
            result = award(db, "S001", "notes_completed", topic="routing")
        assert result.new_total == 100
        assert result.level_up is True
    finally:
        db.close()


def test_streak_increments_and_resets_after_gap():
    db = SessionLocal()
    try:
        award(db, "S001", "notes_completed", topic="routing")
        student = get_student_with_state(db, "S001")
        streak = db.query(Streak).filter(Streak.student_id == student.id).one()
        today = streak.last_active_date

        streak.current = 1
        streak.longest = 1
        streak.last_active_date = today - timedelta(days=1)
        db.commit()
        award(db, "S001", "practice_completed", topic="routing")
        db.refresh(streak)
        assert streak.current == 2
        assert streak.longest == 2

        streak.current = 5
        streak.longest = 5
        streak.last_active_date = today - timedelta(days=3)
        db.commit()
        award(db, "S001", "revision_completed", topic="routing")
        db.refresh(streak)
        assert streak.current == 1
        assert streak.longest == 5
    finally:
        db.close()


def test_daily_goal_completes_when_targets_are_met():
    db = SessionLocal()
    try:
        award(db, "S001", "notes_completed", topic="routing")
        award(db, "S001", "practice_completed", topic="routing")
        award_focus_session(db, "S001", topic="routing")
    finally:
        db.close()

    profile = _client_profile()
    assert profile["daily_goal"]["completed"] is True
    assert profile["daily_goal"]["progress"]["notes"] >= 20
    assert profile["daily_goal"]["progress"]["practice"] >= 40
    assert profile["daily_goal"]["progress"]["focus"] >= 50


def test_each_badge_unlocks_exactly_once():
    db = SessionLocal()
    try:
        _set_topic_score(db, "routing", 0.40)
        award(db, "S001", "notes_completed", topic="routing")
        award(db, "S001", "notes_completed", topic="routing")
        award(db, "S001", "weak_topic_revisited", topic="routing")
        award(db, "S001", "knowledge_transfer", topic="routing")
        award(db, "S001", "notes_completed", topic="routing", meta={"mastery": 0.51})
        _set_mistake(db, "confuses routing table with MAC table")
        award(
            db,
            "S001",
            "mistake_corrected",
            topic="routing",
            meta={"misconception": "confuses routing table with MAC table"},
        )
    finally:
        db.close()

    achievements = _client_achievements()
    unlocked_names = [badge["name"] for badge in achievements if badge["unlocked"]]
    assert unlocked_names.count("First Steps") == 1
    assert unlocked_names.count("Comeback") == 1
    assert unlocked_names.count("Transfer Thinker") == 1
    assert unlocked_names.count("Routing Explorer") == 1
    assert unlocked_names.count("Mistake Fixer") == 1


def test_streak_badges_unlock_once():
    db = SessionLocal()
    try:
        award(db, "S001", "notes_completed", topic="routing")
        student = get_student_with_state(db, "S001")
        streak = db.query(Streak).filter(Streak.student_id == student.id).one()
        today = streak.last_active_date
        streak.current = 6
        streak.longest = 6
        streak.last_active_date = today - timedelta(days=1)
        db.commit()
        award(db, "S001", "practice_completed", topic="routing")
        award(db, "S001", "revision_completed", topic="routing")
    finally:
        db.close()

    unlocked_names = [badge["name"] for badge in _client_achievements() if badge["unlocked"]]
    assert unlocked_names.count("3-Day Streak") == 1
    assert unlocked_names.count("7-Day Streak") == 1


def test_mistake_corrected_requires_recorded_misconception():
    db = SessionLocal()
    try:
        blocked = award(
            db,
            "S001",
            "mistake_corrected",
            topic="routing",
            meta={"misconception": "confuses routing table with MAC table"},
        )
        _set_mistake(db, "confuses routing table with MAC table")
        awarded = award(
            db,
            "S001",
            "mistake_corrected",
            topic="routing",
            meta={"misconception": "confuses routing table with MAC table"},
        )
        assert blocked.xp_awarded == 0
        assert awarded.xp_awarded == GAMIFICATION_XP_ACTIONS["mistake_corrected"]
    finally:
        db.close()


def test_wrong_hard_question_attempt_still_earns_xp(client):
    seed_questions()
    _set_topic_score_for_client("routing", 0.82)
    assessment = client.post(
        "/api/assessments",
        json={"student_id": "S001", "topic": "routing", "count": 5},
    ).json()
    questions = _questions_for_assessment(assessment)
    hard_question = next(question for question in questions if question.difficulty == 3)

    response = client.post(
        f"/api/assessments/{assessment['assessment_id']}/submit",
        json={
            "answers": [
                {
                    "question_id": hard_question.id,
                    "answer": "wrong answer",
                    "hint_used": False,
                    "time_seconds": 12,
                }
            ]
        },
    )

    assert response.status_code == 200
    assert response.json()["gamification"]["xp_awarded"] >= (
        GAMIFICATION_XP_ACTIONS["practice_question_attempted"]
        + GAMIFICATION_XP_ACTIONS["hard_question_attempted"]
    )


def _client_profile():
    from fastapi.testclient import TestClient
    from app.main import app

    return TestClient(app).get("/api/students/S001/gamification").json()


def _client_achievements():
    from fastapi.testclient import TestClient
    from app.main import app

    return TestClient(app).get("/api/students/S001/achievements").json()


def _questions_for_assessment(assessment: dict):
    question_ids = [question["id"] for question in assessment["questions"]]
    db = SessionLocal()
    try:
        return get_questions_by_ids(db, question_ids)
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


def _set_topic_score_for_client(topic_slug: str, score: float) -> None:
    db = SessionLocal()
    try:
        _set_topic_score(db, topic_slug, score)
    finally:
        db.close()


def _set_mistake(db, misconception: str) -> None:
    student = get_student_with_state(db, "S001")
    student.learning_state.mistakes = [misconception]
    db.add(student.learning_state)
    db.commit()

"""Tests for Phase 4B assessments and practice engine."""

from app.database.database import SessionLocal
from app.database.repositories.assessment_repository import get_questions_by_ids
from app.database.repositories.student_repository import get_student_with_state
from scripts.seed_curriculum import seed_curriculum
from scripts.seed_questions import seed_questions


def test_assessment_questions_hide_answers_before_submit(client):
    _seed_question_bank()

    response = client.post(
        "/api/assessments",
        json={"student_id": "S001", "topic": "routing", "count": 2},
    )

    assert response.status_code == 200
    questions = response.json()["questions"]
    assert questions
    for question in questions:
        assert "correct_answer" not in question
        assert "explanation" not in question
        assert "misconception_tag" not in question
        assert "hint_available" in question


def test_each_question_type_is_graded_correctly(client):
    _seed_question_bank()
    assessment = client.post(
        "/api/assessments",
        json={"student_id": "S001", "topic": "routing", "count": 5},
    ).json()
    questions = _questions_for_assessment(assessment)

    response = client.post(
        f"/api/assessments/{assessment['assessment_id']}/submit",
        json={
            "answers": [
                {
                    "question_id": question.id,
                    "answer": question.correct_answer,
                    "hint_used": False,
                    "time_seconds": 10,
                }
                for question in questions
            ]
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["score_summary"]["correct"] == 5
    assert {question.question_type for question in questions} == {
        "mcq",
        "true_false",
        "fill_blank",
        "numerical",
        "short_answer",
    }
    assert all(result["correct"] for result in body["results"])


def test_hint_gives_smaller_reward_than_independent_correct(client):
    _seed_question_bank()
    independent_delta = _submit_one_correct_answer(client, hint_used=False)
    _set_student_topic_state("S001", "routing", 0.64)
    hinted_delta = _submit_one_correct_answer(client, hint_used=True)

    assert independent_delta == 0.10
    assert hinted_delta == 0.05


def test_wrong_answer_with_misconception_records_mistake(client):
    _seed_question_bank()
    _set_student_topic_state("S001", "routing", 0.30)
    assessment = client.post(
        "/api/assessments",
        json={"student_id": "S001", "topic": "routing", "count": 1},
    ).json()
    question = assessment["questions"][0]

    response = client.post(
        f"/api/assessments/{assessment['assessment_id']}/submit",
        json={
            "answers": [
                {
                    "question_id": question["id"],
                    "answer": "MAC address table",
                    "hint_used": False,
                    "time_seconds": 7,
                }
            ]
        },
    )

    assert response.status_code == 200
    result = response.json()["results"][0]
    assert result["correct"] is False
    assert result["misconception_tag"] == "confuses routing table with MAC table"
    student = client.get("/api/students/S001").json()
    assert "confuses routing table with MAC table" in student["learning_state"]["mistakes"]


def test_repeated_misconception_lowers_mastery_more(client):
    _seed_question_bank()
    _set_student_topic_state("S001", "routing", 0.30)

    first = _submit_routing_mac_table_misconception(client)
    second = _submit_routing_mac_table_misconception(client)

    assert round(first["mastery_before"] - first["mastery_after"], 2) == 0.05
    assert round(second["mastery_before"] - second["mastery_after"], 2) == 0.10


def test_weak_recorded_misconception_questions_are_picked_first(client):
    _seed_question_bank()
    _set_student_topic_state(
        "S001",
        "routing",
        0.82,
        mistakes=["confuses routing table with MAC table"],
    )

    response = client.post(
        "/api/assessments",
        json={"student_id": "S001", "topic": "routing", "count": 1},
    )

    assert response.status_code == 200
    question = response.json()["questions"][0]
    assert question["prompt"] == "What does a router use to choose where to send a packet next?"


def test_second_submit_returns_409(client):
    _seed_question_bank()
    assessment = client.post(
        "/api/assessments",
        json={"student_id": "S001", "topic": "routing", "count": 1},
    ).json()
    question = _questions_for_assessment(assessment)[0]
    payload = {
        "answers": [
            {
                "question_id": question.id,
                "answer": question.correct_answer,
                "hint_used": False,
                "time_seconds": 4,
            }
        ]
    }

    first = client.post(f"/api/assessments/{assessment['assessment_id']}/submit", json=payload)
    second = client.post(f"/api/assessments/{assessment['assessment_id']}/submit", json=payload)

    assert first.status_code == 200
    assert second.status_code == 409


def _seed_question_bank() -> None:
    seed_curriculum()
    seed_questions()


def _questions_for_assessment(assessment: dict):
    question_ids = [question["id"] for question in assessment["questions"]]
    db = SessionLocal()
    try:
        return get_questions_by_ids(db, question_ids)
    finally:
        db.close()


def _submit_one_correct_answer(client, *, hint_used: bool) -> float:
    assessment = client.post(
        "/api/assessments",
        json={"student_id": "S001", "topic": "routing", "count": 1},
    ).json()
    question = _questions_for_assessment(assessment)[0]
    response = client.post(
        f"/api/assessments/{assessment['assessment_id']}/submit",
        json={
            "answers": [
                {
                    "question_id": question.id,
                    "answer": question.correct_answer,
                    "hint_used": hint_used,
                    "time_seconds": 8,
                }
            ]
        },
    ).json()
    return round(response["mastery_after"] - response["mastery_before"], 2)


def _submit_routing_mac_table_misconception(client) -> dict:
    assessment = client.post(
        "/api/assessments",
        json={"student_id": "S001", "topic": "routing", "count": 1},
    ).json()
    question_id = assessment["questions"][0]["id"]
    return client.post(
        f"/api/assessments/{assessment['assessment_id']}/submit",
        json={
            "answers": [
                {
                    "question_id": question_id,
                    "answer": "MAC address table",
                    "hint_used": False,
                    "time_seconds": 6,
                }
            ]
        },
    ).json()


def _set_student_topic_state(
    student_id: str,
    topic_slug: str,
    score: float,
    mistakes: list[str] | None = None,
) -> None:
    db = SessionLocal()
    try:
        student = get_student_with_state(db, student_id)
        state = student.learning_state
        scores = dict(state.concept_scores or {})
        scores[topic_slug] = score
        state.concept_scores = scores
        state.mastery = score
        state.mistakes = mistakes or []
        db.add(state)
        db.commit()
    finally:
        db.close()

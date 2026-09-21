"""Tests for curriculum seeding and cascading notes."""

from app.database.database import SessionLocal
from app.database.repositories.curriculum_repository import get_subjects
from app.database.repositories.student_repository import get_student_with_state
from scripts.seed_curriculum import seed_curriculum


def test_seed_curriculum_is_idempotent():
    seed_curriculum()
    seed_curriculum()

    db = SessionLocal()
    try:
        subjects = get_subjects(db)
        assert len(subjects) == 1
        assert subjects[0].name == "Computer Networks"
        assert len(subjects[0].topics) == 4
        assert sum(len(topic.concepts) for topic in subjects[0].topics) == 8
    finally:
        db.close()


def test_notes_return_simple_variant_for_low_mastery(client):
    seed_curriculum()
    routing_id = _topic_id("routing")
    _set_student_topic_score("S001", "routing", 0.30)

    response = client.get(f"/api/topics/{routing_id}/notes?student_id=S001")

    assert response.status_code == 200
    body = response.json()
    assert body["variant"] == "simple"
    assert [level["level"] for level in body["levels"]] == [
        "concept",
        "simple_explanation",
        "analogy",
        "example",
        "practice",
    ]


def test_notes_return_standard_variant_for_mid_mastery(client):
    seed_curriculum()
    routing_id = _topic_id("routing")
    _set_student_topic_score("S001", "routing", 0.64)

    response = client.get(f"/api/topics/{routing_id}/notes?student_id=S001")

    assert response.status_code == 200
    body = response.json()
    assert body["variant"] == "standard"
    assert [level["level"] for level in body["levels"]] == [
        "overview",
        "core_concept",
        "explanation",
        "example",
        "common_mistake",
        "quick_check",
        "practice_prompt",
    ]


def test_notes_return_advanced_variant_for_high_mastery(client):
    seed_curriculum()
    routing_id = _topic_id("routing")
    _set_student_topic_score("S001", "routing", 0.82)

    response = client.get(f"/api/topics/{routing_id}/notes?student_id=S001")

    assert response.status_code == 200
    body = response.json()
    assert body["variant"] == "advanced"
    assert [level["level"] for level in body["levels"]] == [
        "concept",
        "advanced_example",
        "edge_case",
        "challenge",
    ]


def test_common_mistake_flags_student_misconception(client):
    seed_curriculum()
    routing_id = _topic_id("routing")
    _set_student_topic_score(
        "S001",
        "routing",
        0.64,
        mistakes=["confuses routing table with MAC table"],
    )

    response = client.get(f"/api/topics/{routing_id}/notes?student_id=S001")

    assert response.status_code == 200
    common_mistake = next(
        level for level in response.json()["levels"] if level["level"] == "common_mistake"
    )
    assert common_mistake["misconception_flag"] is True


def test_subject_and_topic_endpoints(client):
    seed_curriculum()

    subjects_response = client.get("/api/subjects")

    assert subjects_response.status_code == 200
    subjects = subjects_response.json()
    assert subjects[0]["name"] == "Computer Networks"

    topics_response = client.get(f"/api/subjects/{subjects[0]['id']}/topics")
    assert topics_response.status_code == 200
    assert {topic["slug"] for topic in topics_response.json()} == {
        "arp",
        "ipv4-addressing",
        "routing",
        "switching",
    }


def _topic_id(slug: str) -> int:
    db = SessionLocal()
    try:
        subject = get_subjects(db)[0]
        return next(topic.id for topic in subject.topics if topic.slug == slug)
    finally:
        db.close()


def _set_student_topic_score(
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
        if mistakes is not None:
            state.mistakes = mistakes
        db.add(state)
        db.commit()
    finally:
        db.close()

"""Tests for Phase 4C flashcards and personalized revision."""

from datetime import datetime, timedelta

from app.database.database import SessionLocal
from app.database.repositories.flashcard_repository import (
    get_flashcard,
    get_flashcards_for_topic,
    upsert_review_schedule,
)
from app.database.repositories.student_repository import get_student_with_state
from scripts.seed_flashcards import seed_flashcards


def test_seed_flashcards_is_idempotent():
    seed_flashcards()
    seed_flashcards()

    db = SessionLocal()
    try:
        assert len(get_flashcards_for_topic(db, "routing")) == 8
        assert len(get_flashcards_for_topic(db, "switching")) == 8
        assert len(get_flashcards_for_topic(db, "ipv4-addressing")) == 8
        assert len(get_flashcards_for_topic(db, "arp")) == 8
    finally:
        db.close()


def test_flashcard_deck_returns_requested_topic_and_size(client):
    seed_flashcards()
    _set_student_topic_state("S001", "routing", 0.45)

    response = client.get("/api/students/S001/flashcards?topic=routing&size=4")

    assert response.status_code == 200
    body = response.json()
    assert body["topic_slug"] == "routing"
    assert body["size"] == 4
    assert len(body["cards"]) == 4
    assert {card["topic_slug"] for card in body["cards"]} == {"routing"}
    assert all(card["reason"] == "weak_topic" for card in body["cards"])


def test_due_cards_are_picked_first(client):
    seed_flashcards()
    _set_student_topic_state("S001", "routing", 0.82)
    due_card_id = _make_card_due("S001", "routing")

    response = client.get("/api/students/S001/flashcards?topic=routing&size=3")

    assert response.status_code == 200
    first_card = response.json()["cards"][0]
    assert first_card["id"] == due_card_id
    assert first_card["due"] is True
    assert first_card["reason"] == "due"


def test_previous_mistake_cards_are_prioritized(client):
    seed_flashcards()
    _set_student_topic_state(
        "S001",
        "routing",
        0.82,
        mistakes=["confuses routing table with MAC table"],
    )

    response = client.get("/api/students/S001/flashcards?topic=routing&size=1")

    assert response.status_code == 200
    card = response.json()["cards"][0]
    assert card["front"] == "What table does a router check to forward an IP packet?"
    assert card["reason"] == "previous_mistake"


def test_flashcard_review_updates_topic_slug_score_only(client):
    seed_flashcards()
    _set_student_topic_state("S001", "routing", 0.45)
    card_id = _first_card_id("routing")

    response = client.post(
        f"/api/flashcards/{card_id}/review",
        json={"student_id": "S001", "rating": "knew_it"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["mastery_before"] == 0.45
    assert body["mastery_after"] == 0.55

    student = client.get("/api/students/S001").json()
    scores = student["learning_state"]["concept_scores"]
    assert scores["routing"] == 0.55
    assert "routing-table" not in scores


def test_flashcard_review_records_schedule(client):
    seed_flashcards()
    _set_student_topic_state("S001", "routing", 0.45)
    card_id = _first_card_id("routing")

    response = client.post(
        f"/api/flashcards/{card_id}/review",
        json={"student_id": "S001", "rating": "almost"},
    )

    assert response.status_code == 200
    deck = client.get("/api/students/S001/flashcards?topic=routing&size=8").json()
    reviewed_card = next(card for card in deck["cards"] if card["id"] == card_id)
    assert reviewed_card["last_rating"] == "almost"
    assert reviewed_card["next_review_at"] is not None


def test_didnt_know_records_misconception_and_penalty(client):
    seed_flashcards()
    _set_student_topic_state("S001", "routing", 0.45)
    card_id = _first_card_id("routing")

    response = client.post(
        f"/api/flashcards/{card_id}/review",
        json={"student_id": "S001", "rating": "didnt_know"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["misconception_tag"] == "confuses routing table with MAC table"
    assert body["mastery_after"] == 0.40
    student = client.get("/api/students/S001").json()
    assert "confuses routing table with MAC table" in student["learning_state"]["mistakes"]


def test_repeated_misconception_penalty_on_flashcard_review(client):
    seed_flashcards()
    _set_student_topic_state(
        "S001",
        "routing",
        0.45,
        mistakes=["confuses routing table with MAC table"],
    )
    card_id = _first_card_id("routing")

    response = client.post(
        f"/api/flashcards/{card_id}/review",
        json={"student_id": "S001", "rating": "didnt_know"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["mastery_before"] == 0.45
    assert body["mastery_after"] == 0.35


def _first_card_id(topic_slug: str) -> int:
    db = SessionLocal()
    try:
        return get_flashcards_for_topic(db, topic_slug)[0].id
    finally:
        db.close()


def _make_card_due(student_id: str, topic_slug: str) -> int:
    db = SessionLocal()
    try:
        student = get_student_with_state(db, student_id)
        card = get_flashcards_for_topic(db, topic_slug)[-1]
        upsert_review_schedule(
            db,
            student=student,
            flashcard=card,
            rating="knew_it",
            next_review_at=datetime.utcnow() - timedelta(days=1),
        )
        return card.id
    finally:
        db.close()


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

"""Flashcard service layer."""

from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.database.repositories.flashcard_repository import (
    get_flashcard,
    get_flashcards,
    get_flashcards_for_topic,
    get_reviews_for_student,
    upsert_review_schedule,
)
from app.database.repositories.learning_event_repository import create_learning_event
from app.database.repositories.student_repository import get_student_with_state
from app.engine.confidence import adjust_confidence
from app.engine.mastery import apply_mastery_event, mastery_band_label
from app.engine.misconceptions import add_misconception
from app.schemas.flashcard import FlashcardDeckRead, FlashcardRead, FlashcardReviewResponse

RATING_INTERVALS = {
    "didnt_know": timedelta(days=1),
    "almost": timedelta(days=2),
    "knew_it": timedelta(days=4),
    "easy": timedelta(days=7),
}


def build_flashcard_deck(
    db: Session,
    *,
    student_id: str,
    topic: str | None,
    size: int,
) -> FlashcardDeckRead | None:
    student = get_student_with_state(db, student_id)
    if student is None or student.learning_state is None:
        return None

    topic_slug = _resolve_topic_slug(student.learning_state, topic)
    cards = get_flashcards_for_topic(db, topic_slug) if topic_slug else get_flashcards(db)
    reviews = {review.flashcard_id: review for review in get_reviews_for_student(db, student)}
    now = datetime.utcnow()
    mistakes = {mistake.casefold() for mistake in (student.learning_state.mistakes or [])}
    score = float((student.learning_state.concept_scores or {}).get(topic_slug, student.learning_state.mastery))

    ranked = sorted(
        cards,
        key=lambda card: _deck_priority(card, reviews.get(card.id), mistakes, score, now),
    )
    selected = ranked[:size]
    return FlashcardDeckRead(
        student_id=student.student_id,
        topic_slug=topic_slug or "mixed",
        size=len(selected),
        cards=[_card_to_read(card, reviews.get(card.id), mistakes, score, now) for card in selected],
    )


def review_flashcard(
    db: Session,
    *,
    flashcard_id: int,
    student_id: str,
    rating: str,
) -> FlashcardReviewResponse | None:
    student = get_student_with_state(db, student_id)
    card = get_flashcard(db, flashcard_id)
    if student is None or student.learning_state is None or card is None:
        return None

    state = student.learning_state
    topic_slug = card.topic_slug
    concept_scores = dict(state.concept_scores or {})
    mastery_before = float(concept_scores.get(topic_slug, state.mastery or 0.0))
    repeated = _is_repeated_misconception(state.mistakes or [], card.misconception_tag)
    mastery_event = _mastery_event_for_rating(rating, repeated)
    mastery_after = apply_mastery_event(mastery_before, mastery_event)

    concept_scores[topic_slug] = mastery_after
    state.concept_scores = concept_scores
    state.mastery = mastery_after
    state.confidence = _confidence_for_rating(state.confidence, rating)
    if rating == "didnt_know" and card.misconception_tag:
        state.mistakes, _ = add_misconception(state.mistakes or [], card.misconception_tag)

    db.add(state)
    db.commit()
    db.refresh(state)

    next_review_at = datetime.utcnow() + RATING_INTERVALS[rating]
    upsert_review_schedule(
        db,
        student=student,
        flashcard=card,
        rating=rating,
        next_review_at=next_review_at,
    )
    create_learning_event(
        db,
        student_id=student.id,
        session_id=None,
        concept=topic_slug,
        answer_quality="correct" if rating in {"knew_it", "easy", "almost"} else "incorrect",
        mastery_before=mastery_before,
        mastery_after=mastery_after,
    )
    return FlashcardReviewResponse(
        flashcard_id=card.id,
        topic_slug=topic_slug,
        rating=rating,
        next_review_at=next_review_at,
        mastery_before=mastery_before,
        mastery_after=mastery_after,
        mastery_band=mastery_band_label(mastery_after),
        misconception_tag=card.misconception_tag if rating == "didnt_know" else None,
        note="This card targets a common mix-up to review." if rating == "didnt_know" and card.misconception_tag else None,
    )


def _deck_priority(card, review, mistakes: set[str], score: float, now: datetime) -> tuple:
    due = review is not None and review.next_review_at <= now
    misconception_match = card.misconception_tag and card.misconception_tag.casefold() in mistakes
    weak_topic = score <= 0.50
    return (
        0 if due else 1,
        0 if misconception_match else 1,
        0 if weak_topic else 1,
        review.next_review_at if review else datetime.max,
        card.id,
    )


def _card_to_read(card, review, mistakes: set[str], score: float, now: datetime) -> FlashcardRead:
    due = review is not None and review.next_review_at <= now
    misconception_match = card.misconception_tag and card.misconception_tag.casefold() in mistakes
    if due:
        reason = "due"
    elif misconception_match:
        reason = "previous_mistake"
    elif score <= 0.50:
        reason = "weak_topic"
    else:
        reason = "topic_revision"
    return FlashcardRead(
        id=card.id,
        topic_slug=card.topic_slug,
        concept_slug=card.concept_slug,
        front=card.front,
        back=card.back,
        due=due,
        next_review_at=review.next_review_at if review else None,
        last_rating=review.last_rating if review else None,
        reason=reason,
    )


def _mastery_event_for_rating(rating: str, repeated_misconception: bool) -> str:
    if rating == "didnt_know":
        return "repeated_misconception" if repeated_misconception else "incorrect"
    if rating == "almost":
        return "correct_with_hint"
    return "correct_independently"


def _confidence_for_rating(current_confidence: float, rating: str) -> float:
    if rating in {"knew_it", "easy"}:
        return adjust_confidence(current_confidence, "independent_success")
    if rating == "almost":
        return adjust_confidence(current_confidence, "independent_attempt")
    return adjust_confidence(current_confidence, "i_dont_know")


def _is_repeated_misconception(mistakes: list[str], misconception_tag: str | None) -> bool:
    if not misconception_tag:
        return False
    return any(mistake.casefold() == misconception_tag.casefold() for mistake in mistakes)


def _resolve_topic_slug(learning_state, topic: str | None) -> str:
    if topic:
        return _slugify(topic)
    scores = learning_state.concept_scores or {}
    if scores:
        return min(scores, key=scores.get)
    return ""


def _slugify(value: str) -> str:
    return " ".join(value.strip().casefold().split()).replace(" ", "-")

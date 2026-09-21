"""Repository helpers for flashcards and review schedules."""

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.flashcard import Flashcard, FlashcardReview
from app.models.student import Student


def upsert_flashcard(db: Session, data: dict) -> Flashcard:
    card = db.scalars(select(Flashcard).where(Flashcard.source_id == data["source_id"])).first()
    if card is None:
        card = Flashcard(source_id=data["source_id"])
        db.add(card)
    card.topic_slug = data["topic_slug"]
    card.concept_slug = data["concept_slug"]
    card.front = data["front"]
    card.back = data["back"]
    card.misconception_tag = data.get("misconception_tag")
    db.commit()
    db.refresh(card)
    return card


def get_flashcard(db: Session, flashcard_id: int) -> Flashcard | None:
    return db.get(Flashcard, flashcard_id)


def get_flashcards_for_topic(db: Session, topic_slug: str) -> list[Flashcard]:
    statement = select(Flashcard).where(Flashcard.topic_slug == topic_slug).order_by(Flashcard.id)
    return list(db.scalars(statement).all())


def get_flashcards(db: Session) -> list[Flashcard]:
    return list(db.scalars(select(Flashcard).order_by(Flashcard.topic_slug, Flashcard.id)).all())


def get_reviews_for_student(db: Session, student: Student) -> list[FlashcardReview]:
    statement = select(FlashcardReview).where(FlashcardReview.student_id == student.id)
    return list(db.scalars(statement).all())


def get_review(db: Session, student: Student, flashcard: Flashcard) -> FlashcardReview | None:
    statement = select(FlashcardReview).where(
        FlashcardReview.student_id == student.id,
        FlashcardReview.flashcard_id == flashcard.id,
    )
    return db.scalars(statement).first()


def upsert_review_schedule(
    db: Session,
    *,
    student: Student,
    flashcard: Flashcard,
    rating: str,
    next_review_at: datetime,
) -> FlashcardReview:
    review = get_review(db, student, flashcard)
    if review is None:
        review = FlashcardReview(
            student_id=student.id,
            flashcard_id=flashcard.id,
            last_rating=rating,
            next_review_at=next_review_at,
        )
        db.add(review)
    else:
        review.last_rating = rating
        review.next_review_at = next_review_at
        review.reviewed_at = datetime.utcnow()
        review.review_count += 1
    db.commit()
    db.refresh(review)
    return review

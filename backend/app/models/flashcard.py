"""Flashcard models for Phase 4C."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database.database import Base


class Flashcard(Base):
    __tablename__ = "flashcards"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    source_id: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    topic_slug: Mapped[str] = mapped_column(String(255), index=True)
    concept_slug: Mapped[str] = mapped_column(String(255), index=True)
    front: Mapped[str] = mapped_column(Text)
    back: Mapped[str] = mapped_column(Text)
    misconception_tag: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class FlashcardReview(Base):
    __tablename__ = "flashcard_reviews"
    __table_args__ = (
        UniqueConstraint("student_id", "flashcard_id", name="uq_flashcard_reviews_student_card"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), index=True)
    flashcard_id: Mapped[int] = mapped_column(ForeignKey("flashcards.id"), index=True)
    last_rating: Mapped[str] = mapped_column(String(32))
    next_review_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    reviewed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    review_count: Mapped[int] = mapped_column(Integer, default=1)

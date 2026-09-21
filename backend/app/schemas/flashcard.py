"""Pydantic schemas for flashcards."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.gamification import GamificationAwardRead


class FlashcardRead(BaseModel):
    id: int
    topic_slug: str
    concept_slug: str
    front: str
    back: str
    due: bool
    next_review_at: datetime | None = None
    last_rating: str | None = None
    reason: str


class FlashcardDeckRead(BaseModel):
    student_id: str
    topic_slug: str
    size: int
    cards: list[FlashcardRead]


class FlashcardReviewRequest(BaseModel):
    student_id: str = Field(min_length=1)
    rating: Literal["didnt_know", "almost", "knew_it", "easy"]


class FlashcardReviewResponse(BaseModel):
    flashcard_id: int
    topic_slug: str
    rating: str
    next_review_at: datetime
    mastery_before: float
    mastery_after: float
    mastery_band: str
    misconception_tag: str | None = None
    note: str | None = None
    gamification: GamificationAwardRead | None = None

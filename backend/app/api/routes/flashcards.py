"""Flashcard API routes."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.schemas.flashcard import FlashcardDeckRead, FlashcardReviewRequest, FlashcardReviewResponse
from app.services.flashcard_service import build_flashcard_deck, review_flashcard

router = APIRouter(prefix="/api", tags=["flashcards"])


@router.get("/students/{student_id}/flashcards", response_model=FlashcardDeckRead)
def read_student_flashcards(
    student_id: str,
    topic: str | None = Query(default=None),
    size: int = Query(default=8, ge=1, le=50),
    db: Session = Depends(get_db),
) -> FlashcardDeckRead:
    deck = build_flashcard_deck(db, student_id=student_id, topic=topic, size=size)
    if deck is None:
        raise HTTPException(status_code=404, detail="Student not found")
    return deck


@router.post("/flashcards/{flashcard_id}/review", response_model=FlashcardReviewResponse)
def submit_flashcard_review(
    flashcard_id: int,
    payload: FlashcardReviewRequest,
    db: Session = Depends(get_db),
) -> FlashcardReviewResponse:
    response = review_flashcard(
        db,
        flashcard_id=flashcard_id,
        student_id=payload.student_id,
        rating=payload.rating,
    )
    if response is None:
        raise HTTPException(status_code=404, detail="Student or flashcard not found")
    return response

"""Pydantic schemas for progress snapshots without Phase 3 calculations."""

from pydantic import BaseModel


class ProgressRead(BaseModel):
    student_id: str
    mastery: float
    confidence: float
    adaptability: float
    pace: str
    concept_scores: dict[str, float]

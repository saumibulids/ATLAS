"""Pydantic schemas for progress snapshots and next activity."""

from datetime import datetime

from pydantic import BaseModel


class LearningEventRead(BaseModel):
    id: int
    session_id: int
    concept: str
    answer_quality: str
    mastery_before: float
    mastery_after: float
    timestamp: datetime


class ProgressRead(BaseModel):
    student_id: str
    mastery: float
    mastery_band: str
    confidence: float
    adaptability: float
    pace: str
    concept_scores: dict[str, float]
    recent_learning_events: list[LearningEventRead]


class NextActivityRead(BaseModel):
    activity: str
    topic: str
    reason: str

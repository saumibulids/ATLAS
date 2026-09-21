"""Pydantic schemas for student responses."""

from pydantic import BaseModel, ConfigDict


class CurrentLearning(BaseModel):
    subject: str | None = None
    topic: str | None = None


class LearningStateRead(BaseModel):
    mastery: float
    confidence: float
    adaptability: float
    pace: str
    concept_scores: dict[str, float]
    mistakes: list[str]

    model_config = ConfigDict(from_attributes=True)


class StudentRead(BaseModel):
    student_id: str
    name: str | None
    grade: int | None
    language: str
    current_learning: CurrentLearning
    learning_state: LearningStateRead

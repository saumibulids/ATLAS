"""Pydantic schemas for student requests and responses."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


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


class StudentCreate(BaseModel):
    name: str = Field(min_length=1)
    grade: int | None = None
    language: str = Field(default="English", min_length=1)
    explanation_style: str = Field(default="examples", min_length=1)


class StudentPatch(BaseModel):
    language: str | None = Field(default=None, min_length=1)
    explanation_style: str | None = Field(default=None, min_length=1)
    preferences: dict[str, Any] | None = None
    current_learning: CurrentLearning | None = None
    subject: str | None = None
    topic: str | None = None


class StudentRead(BaseModel):
    student_id: str
    name: str | None
    grade: int | None
    language: str
    explanation_style: str
    preferences: dict[str, Any]
    current_learning: CurrentLearning
    learning_state: LearningStateRead


class SessionRead(BaseModel):
    id: int
    subject: str
    topic: str
    started_at: datetime

    model_config = ConfigDict(from_attributes=True)

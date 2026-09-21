"""Pydantic schemas for chat requests and responses."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.gamification import GamificationAwardRead


class ChatRequest(BaseModel):
    student_id: str = Field(min_length=1)
    message: str = Field(min_length=1)
    subject: str = Field(min_length=1)
    topic: str = Field(min_length=1)


class StudentStateSummary(BaseModel):
    mastery: float
    confidence: float


class ChatResponse(BaseModel):
    session_id: int
    reply: str
    student_state: StudentStateSummary
    gamification: GamificationAwardRead | None = None


class MessageRead(BaseModel):
    id: int
    session_id: int
    role: str
    content: str
    created_at: datetime

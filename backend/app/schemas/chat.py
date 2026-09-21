"""Pydantic schemas for chat requests and responses."""

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    student_id: str = Field(min_length=1)
    message: str = Field(min_length=1)
    subject: str = Field(min_length=1)
    topic: str = Field(min_length=1)


class StudentStateSummary(BaseModel):
    mastery: float
    confidence: float


class ChatResponse(BaseModel):
    reply: str
    student_state: StudentStateSummary

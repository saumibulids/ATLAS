"""Pydantic schemas for cascading notes."""

from pydantic import BaseModel


class NoteLevelRead(BaseModel):
    level: str
    content: str
    question: str | None = None
    answer: str | None = None
    misconception_flag: bool = False


class TopicNotesRead(BaseModel):
    topic_id: int
    topic: str
    variant: str
    levels: list[NoteLevelRead]

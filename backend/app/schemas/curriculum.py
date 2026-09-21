"""Pydantic schemas for curriculum responses."""

from pydantic import BaseModel


class SubjectRead(BaseModel):
    id: int
    name: str
    slug: str
    description: str | None


class TopicRead(BaseModel):
    id: int
    subject_id: int
    title: str
    slug: str
    summary: str | None

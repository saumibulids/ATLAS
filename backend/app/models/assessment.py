"""Assessment and question bank models for Phase 4B."""

from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.database import Base


class Assessment(Base):
    __tablename__ = "assessments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), index=True)
    topic_slug: Mapped[str] = mapped_column(String(255), index=True)
    question_ids: Mapped[list[int]] = mapped_column(JSON, default=list)
    submitted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    answers: Mapped[list["Answer"]] = relationship(
        back_populates="assessment",
        cascade="all, delete-orphan",
    )


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    source_id: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    question_type: Mapped[str] = mapped_column(String(32))
    topic_slug: Mapped[str] = mapped_column(String(255), index=True)
    concept_slug: Mapped[str] = mapped_column(String(255), index=True)
    difficulty: Mapped[int] = mapped_column(Integer, index=True)
    prompt: Mapped[str] = mapped_column(Text)
    options: Mapped[list[str]] = mapped_column(JSON, default=list)
    correct_answer: Mapped[str] = mapped_column(Text)
    hint: Mapped[str] = mapped_column(Text)
    explanation: Mapped[str] = mapped_column(Text)
    misconception_tags: Mapped[dict[str, str]] = mapped_column(JSON, default=dict)
    keywords: Mapped[list[str]] = mapped_column(JSON, default=list)
    numerical_tolerance: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Answer(Base):
    __tablename__ = "answers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    assessment_id: Mapped[int] = mapped_column(ForeignKey("assessments.id"), index=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id"), index=True)
    answer: Mapped[str] = mapped_column(Text)
    hint_used: Mapped[bool] = mapped_column(Boolean, default=False)
    time_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    correct: Mapped[bool] = mapped_column(Boolean, default=False)
    misconception_tag: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    assessment: Mapped["Assessment"] = relationship(back_populates="answers")

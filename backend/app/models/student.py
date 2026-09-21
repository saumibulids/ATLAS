"""Student model for Phase 2."""

from datetime import datetime

from typing import Any

from sqlalchemy import DateTime, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.database import Base


class Student(Base):
    __tablename__ = "students"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    student_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    grade: Mapped[int | None] = mapped_column(Integer, nullable=True)
    language: Mapped[str] = mapped_column(String(64), default="English")
    explanation_style: Mapped[str] = mapped_column(String(64), default="examples")
    preferences: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    subject: Mapped[str | None] = mapped_column(String(255), nullable=True)
    topic: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    learning_state: Mapped["LearningState"] = relationship(
        back_populates="student",
        cascade="all, delete-orphan",
        uselist=False,
    )
    sessions: Mapped[list["Session"]] = relationship(
        back_populates="student",
        cascade="all, delete-orphan",
    )

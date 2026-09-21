"""Learning state model for Phase 1."""

from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, Float, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.database import Base


class LearningState(Base):
    __tablename__ = "learning_states"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), unique=True, index=True)
    mastery: Mapped[float] = mapped_column(Float, default=0.0)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    adaptability: Mapped[float] = mapped_column(Float, default=0.0)
    pace: Mapped[str] = mapped_column(String(32), default="medium")
    concept_scores: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    mistakes: Mapped[list[str]] = mapped_column(JSON, default=list)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    student: Mapped["Student"] = relationship(back_populates="learning_state")

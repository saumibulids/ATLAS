"""Focus session models for Phase 6."""

import datetime as dt
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.database import Base


class FocusSession(Base):
    __tablename__ = "focus_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), index=True)
    topic: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    mode: Mapped[str] = mapped_column(String(16), default="single")  # "single" | "pomodoro"
    planned_minutes: Mapped[int] = mapped_column(Integer)
    study_minutes: Mapped[int] = mapped_column(Integer, default=0)
    break_minutes: Mapped[int] = mapped_column(Integer, default=0)
    rounds: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(  # "active" | "on_break" | "completed" | "abandoned"
        String(16),
        default="active",
        index=True,
    )
    started_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow, index=True)
    ended_at: Mapped[dt.datetime | None] = mapped_column(DateTime, nullable=True)
    active_seconds: Mapped[int] = mapped_column(Integer, default=0)
    break_seconds: Mapped[int] = mapped_column(Integer, default=0)
    interruption_count: Mapped[int] = mapped_column(Integer, default=0)
    current_round: Mapped[int] = mapped_column(Integer, default=1)
    questions_attempted: Mapped[int | None] = mapped_column(Integer, nullable=True)
    concepts_studied: Mapped[list[Any]] = mapped_column(JSON, default=list)
    plan: Mapped[list[dict[str, Any]] | None] = mapped_column(JSON, nullable=True)

    interruptions: Mapped[list["FocusInterruption"]] = relationship(
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="FocusInterruption.hidden_at",
    )


class FocusInterruption(Base):
    __tablename__ = "focus_interruptions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("focus_sessions.id"), index=True)
    hidden_at: Mapped[dt.datetime] = mapped_column(DateTime, index=True)
    visible_at: Mapped[dt.datetime | None] = mapped_column(DateTime, nullable=True)
    seconds_away: Mapped[int] = mapped_column(Integer, default=0)

    session: Mapped["FocusSession"] = relationship(back_populates="interruptions")
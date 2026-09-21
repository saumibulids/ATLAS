"""Pydantic schemas for Phase 6 focus sessions."""

import datetime as dt

from pydantic import BaseModel, Field

from app.schemas.gamification import GamificationAwardRead


class FocusStartRequest(BaseModel):
    student_id: str = Field(min_length=1)
    topic: str | None = None
    mode: str = "single"
    duration_minutes: int = Field(ge=5, le=180)


class FocusPhaseRead(BaseModel):
    phase: str
    start_minute: int
    end_minute: int
    suggested_activity: str


class FocusStartResponse(BaseModel):
    session_id: int
    topic: str | None
    mode: str
    planned_minutes: int
    started_at: dt.datetime
    plan: list[FocusPhaseRead]
    remaining_seconds: int
    status: str
    message: str | None = None


class FocusInterruptResponse(BaseModel):
    session_id: int
    message: str
    remaining_seconds: int
    status: str


class FocusResumeResponse(BaseModel):
    session_id: int
    message: str
    remaining_seconds: int
    status: str


class FocusCompleteRequest(BaseModel):
    questions_attempted: int | None = Field(default=None, ge=0)
    concepts_studied: list[str] | None = None


class FocusCompleteResponse(BaseModel):
    session_id: int
    status: str
    active_seconds: int
    planned_minutes: int
    message: str
    gamification: GamificationAwardRead | None = None


class FocusSessionRead(BaseModel):
    session_id: int
    student_id: str
    topic: str | None
    mode: str
    planned_minutes: int
    status: str
    started_at: dt.datetime
    ended_at: dt.datetime | None
    elapsed_seconds: int
    remaining_seconds: int
    active_seconds: int
    break_seconds: int
    interruption_count: int
    current_round: int
    questions_attempted: int | None
    concepts_studied: list[str]
    plan: list[FocusPhaseRead]
    current_phase: FocusPhaseRead | None
    message: str | None = None
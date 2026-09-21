"""Pydantic schemas for Phase 6 focus sessions (single run + Pomodoro) and analytics."""

import datetime as dt

from pydantic import BaseModel, Field

from app.schemas.gamification import GamificationAwardRead


class FocusStartRequest(BaseModel):
    student_id: str = Field(min_length=1)
    topic: str | None = None
    mode: str = "single"  # "single" | "pomodoro"
    # Single-mode duration.
    duration_minutes: int | None = Field(default=None, ge=5, le=180)
    # Pomodoro: either a preset ("25/5", "45/10") or an explicit configuration.
    preset: str | None = None
    study_minutes: int | None = Field(default=None, ge=5, le=90)
    break_minutes: int | None = Field(default=None, ge=1, le=30)
    rounds: int | None = Field(default=None, ge=1, le=8)


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
    study_minutes: int | None = None
    break_minutes: int | None = None
    rounds: int | None = None
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


class FocusBreakResponse(BaseModel):
    session_id: int
    status: str
    message: str
    remaining_seconds: int
    segment_remaining_seconds: int
    current_round: int


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
    study_minutes: int | None = None
    break_minutes: int | None = None
    rounds: int | None = None
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
    # "study" | "break"; null for sessions that have no segment concept.
    segment: str | None = None
    segment_remaining_seconds: int | None = None
    message: str | None = None


class FocusRecentSessionRead(BaseModel):
    id: int
    topic: str | None
    mode: str
    planned_minutes: int
    active_seconds: int
    interruption_count: int
    status: str
    started_at: dt.datetime


class FocusTopicStatsRead(BaseModel):
    topic: str
    active_minutes: int


class FocusAnalyticsRead(BaseModel):
    student_id: str
    total_sessions: int
    completed_count: int
    abandoned_count: int
    total_active_minutes: int
    avg_planned_minutes: float
    avg_active_minutes: float
    avg_interruptions_per_session: float
    topics_studied: list[FocusTopicStatsRead]
    recent_sessions: list[FocusRecentSessionRead]
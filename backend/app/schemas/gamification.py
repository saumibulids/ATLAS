"""Pydantic schemas for gamification."""

from datetime import datetime

from pydantic import BaseModel, Field


class GamificationAwardRead(BaseModel):
    xp_awarded: int
    new_total: int
    level_up: bool
    badges_unlocked: list[str]
    reason: str | None = None


class ActivityRequest(BaseModel):
    type: str = Field(min_length=1)
    topic: str | None = None


class StreakRead(BaseModel):
    current: int
    longest: int


class BadgeRead(BaseModel):
    id: str
    name: str
    unlocked_at: datetime


class DailyGoalRead(BaseModel):
    targets: dict[str, int]
    progress: dict[str, int]
    completed: bool


class XPEventRead(BaseModel):
    action: str
    xp: int
    topic: str | None
    created_at: datetime


class GamificationProfileRead(BaseModel):
    xp: int
    level: int
    xp_to_next_level: int
    streak: StreakRead
    badges: list[BadgeRead]
    daily_goal: DailyGoalRead
    recent_xp: list[XPEventRead]


class AchievementStateRead(BaseModel):
    id: str
    name: str
    criteria: str
    unlocked: bool
    unlocked_at: datetime | None = None

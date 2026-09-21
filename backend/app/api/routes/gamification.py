"""Gamification API routes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.schemas.gamification import AchievementStateRead, GamificationProfileRead
from app.services.gamification_service import get_achievement_states, get_gamification_profile

router = APIRouter(prefix="/api/students", tags=["gamification"])


@router.get("/{student_id}/gamification", response_model=GamificationProfileRead)
def read_gamification_profile(
    student_id: str,
    db: Session = Depends(get_db),
) -> GamificationProfileRead:
    profile = get_gamification_profile(db, student_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Student not found")
    return profile


@router.get("/{student_id}/achievements", response_model=list[AchievementStateRead])
def read_achievements(
    student_id: str,
    db: Session = Depends(get_db),
) -> list[AchievementStateRead]:
    achievements = get_achievement_states(db, student_id)
    if achievements is None:
        raise HTTPException(status_code=404, detail="Student not found")
    return achievements

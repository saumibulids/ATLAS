"""Gamification service layer."""

from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.core.constants import (
    GAMIFICATION_ACTION_CATEGORIES,
    GAMIFICATION_BADGES,
    GAMIFICATION_DAILY_GOAL_TARGETS,
    GAMIFICATION_DAILY_XP_CAPS,
    GAMIFICATION_LEVEL_THRESHOLDS,
    GAMIFICATION_STREAK_TIMEZONE,
    GAMIFICATION_XP_ACTIONS,
)
from app.database.repositories.student_repository import get_student_with_state
from app.engine.mastery import mastery_band_label
from app.models.gamification import Achievement, DailyGoal, Streak, StudentXP
from app.schemas.gamification import (
    AchievementStateRead,
    BadgeRead,
    DailyGoalRead,
    GamificationAwardRead,
    GamificationProfileRead,
    StreakRead,
    XPEventRead,
)


def award(
    db: Session,
    student_id: str,
    action: str,
    topic: str | None = None,
    meta: dict | None = None,
) -> GamificationAwardRead:
    meta = meta or {}
    student = get_student_with_state(db, student_id)
    if student is None:
        return _empty_award("Student not found")
    if action not in GAMIFICATION_XP_ACTIONS:
        return _empty_award("Unknown gamification action")
    total_before = _total_xp(db, student.id)
    if not _action_is_eligible(student, action, topic, meta):
        return GamificationAwardRead(
            xp_awarded=0,
            new_total=total_before,
            level_up=False,
            badges_unlocked=[],
            reason="Action is not eligible for XP yet",
        )

    level_before = _level_for_xp(total_before)
    base_xp = GAMIFICATION_XP_ACTIONS[action]
    xp_awarded = _capped_xp_for_today(db, student.id, action, base_xp)
    if xp_awarded <= 0:
        return GamificationAwardRead(
            xp_awarded=0,
            new_total=total_before,
            level_up=False,
            badges_unlocked=[],
            reason="Daily XP cap reached for this action",
        )

    event = StudentXP(
        student_id=student.id,
        action=action,
        xp=xp_awarded,
        topic=topic,
        meta=meta,
    )
    db.add(event)
    db.commit()

    _update_streak(db, student.id)
    _upsert_daily_goal(db, student.id)
    badges = _unlock_badges(db, student.id, action, topic, meta)
    total_after = _total_xp(db, student.id)
    level_after = _level_for_xp(total_after)
    return GamificationAwardRead(
        xp_awarded=xp_awarded,
        new_total=total_after,
        level_up=level_after > level_before,
        badges_unlocked=[badge.name for badge in badges],
    )


def award_focus_session(db: Session, student_id: str, topic: str | None = None) -> GamificationAwardRead:
    """Phase 6 hook for completed focus sessions."""
    return award(db, student_id, "focus_session_completed", topic=topic)


def combine_awards(results: list[GamificationAwardRead]) -> GamificationAwardRead | None:
    meaningful = [result for result in results if result is not None]
    if not meaningful:
        return None
    return GamificationAwardRead(
        xp_awarded=sum(result.xp_awarded for result in meaningful),
        new_total=max(result.new_total for result in meaningful),
        level_up=any(result.level_up for result in meaningful),
        badges_unlocked=[
            badge
            for result in meaningful
            for badge in result.badges_unlocked
            if badge
        ],
        reason="; ".join(result.reason for result in meaningful if result.reason) or None,
    )


def get_gamification_profile(db: Session, student_id: str) -> GamificationProfileRead | None:
    student = get_student_with_state(db, student_id)
    if student is None:
        return None
    total = _total_xp(db, student.id)
    level = _level_for_xp(total)
    streak = _get_or_create_streak(db, student.id)
    daily_goal = _upsert_daily_goal(db, student.id)
    badges = _get_unlocked_badges(db, student.id)
    recent_events = _recent_xp_events(db, student.id)
    return GamificationProfileRead(
        xp=total,
        level=level,
        xp_to_next_level=_xp_to_next_level(total),
        streak=StreakRead(current=streak.current, longest=streak.longest),
        badges=[BadgeRead(id=badge.badge_id, name=badge.name, unlocked_at=badge.unlocked_at) for badge in badges],
        daily_goal=DailyGoalRead(
            targets=daily_goal.targets,
            progress=daily_goal.progress,
            completed=daily_goal.completed,
        ),
        recent_xp=[
            XPEventRead(action=event.action, xp=event.xp, topic=event.topic, created_at=event.created_at)
            for event in recent_events
        ],
    )


def get_achievement_states(db: Session, student_id: str) -> list[AchievementStateRead] | None:
    student = get_student_with_state(db, student_id)
    if student is None:
        return None
    unlocked = {badge.badge_id: badge for badge in _get_unlocked_badges(db, student.id)}
    badge_defs = dict(GAMIFICATION_BADGES)
    for badge in unlocked.values():
        if badge.badge_id.startswith("topic_explorer:"):
            badge_defs[badge.badge_id] = {
                "name": badge.name,
                "criteria": "Reach Understanding mastery or higher in this topic.",
            }
    return [
        AchievementStateRead(
            id=badge_id,
            name=definition["name"],
            criteria=definition["criteria"],
            unlocked=badge_id in unlocked,
            unlocked_at=unlocked[badge_id].unlocked_at if badge_id in unlocked else None,
        )
        for badge_id, definition in badge_defs.items()
    ]


def _action_is_eligible(student, action: str, topic: str | None, meta: dict) -> bool:
    state = student.learning_state
    if action == "mistake_corrected":
        misconception = meta.get("misconception")
        return bool(misconception and state and misconception in (state.mistakes or []))
    if action == "weak_topic_revisited":
        if not state or not topic:
            return False
        score = (state.concept_scores or {}).get(topic, state.mastery)
        return float(score) <= 0.50
    return True


def _capped_xp_for_today(db: Session, student_pk: int, action: str, base_xp: int) -> int:
    cap = GAMIFICATION_DAILY_XP_CAPS[action]
    earned_today = _xp_today_for_action(db, student_pk, action)
    return max(0, min(base_xp, cap - earned_today))


def _xp_today_for_action(db: Session, student_pk: int, action: str) -> int:
    start_utc, end_utc = _today_bounds_utc()
    statement = select(func.coalesce(func.sum(StudentXP.xp), 0)).where(
        StudentXP.student_id == student_pk,
        StudentXP.action == action,
        StudentXP.created_at >= start_utc,
        StudentXP.created_at < end_utc,
    )
    return int(db.scalar(statement) or 0)


def _total_xp(db: Session, student_pk: int) -> int:
    return int(
        db.scalar(
            select(func.coalesce(func.sum(StudentXP.xp), 0)).where(StudentXP.student_id == student_pk)
        )
        or 0
    )


def _level_for_xp(total_xp: int) -> int:
    level = 1
    for threshold in GAMIFICATION_LEVEL_THRESHOLDS[1:]:
        if total_xp >= threshold:
            level += 1
    return level


def _xp_to_next_level(total_xp: int) -> int:
    for threshold in GAMIFICATION_LEVEL_THRESHOLDS[1:]:
        if total_xp < threshold:
            return threshold - total_xp
    return 0


def _get_or_create_streak(db: Session, student_pk: int) -> Streak:
    streak = db.scalars(select(Streak).where(Streak.student_id == student_pk)).first()
    if streak is None:
        streak = Streak(student_id=student_pk, current=0, longest=0)
        db.add(streak)
        db.commit()
        db.refresh(streak)
    return streak


def _update_streak(db: Session, student_pk: int) -> Streak:
    today = _today_local()
    streak = _get_or_create_streak(db, student_pk)
    if streak.last_active_date == today:
        return streak
    if streak.last_active_date == today - timedelta(days=1):
        streak.current += 1
    else:
        streak.current = 1
    streak.longest = max(streak.longest, streak.current)
    streak.last_active_date = today
    db.add(streak)
    db.commit()
    db.refresh(streak)
    return streak


def _upsert_daily_goal(db: Session, student_pk: int) -> DailyGoal:
    today = _today_local()
    progress = _daily_goal_progress(db, student_pk)
    completed = all(progress.get(key, 0) >= value for key, value in GAMIFICATION_DAILY_GOAL_TARGETS.items())
    goal = db.scalars(
        select(DailyGoal).where(DailyGoal.student_id == student_pk, DailyGoal.date == today)
    ).first()
    if goal is None:
        goal = DailyGoal(
            student_id=student_pk,
            date=today,
            targets=dict(GAMIFICATION_DAILY_GOAL_TARGETS),
            progress=progress,
            completed=completed,
        )
        db.add(goal)
    else:
        goal.targets = dict(GAMIFICATION_DAILY_GOAL_TARGETS)
        goal.progress = progress
        goal.completed = completed
    db.commit()
    db.refresh(goal)
    return goal


def _daily_goal_progress(db: Session, student_pk: int) -> dict[str, int]:
    progress = {key: 0 for key in GAMIFICATION_DAILY_GOAL_TARGETS}
    start_utc, end_utc = _today_bounds_utc()
    events = db.scalars(
        select(StudentXP).where(
            StudentXP.student_id == student_pk,
            StudentXP.created_at >= start_utc,
            StudentXP.created_at < end_utc,
        )
    ).all()
    for event in events:
        category = GAMIFICATION_ACTION_CATEGORIES.get(event.action)
        if category in progress:
            progress[category] += event.xp
    return progress


def _unlock_badges(db: Session, student_pk: int, action: str, topic: str | None, meta: dict) -> list[Achievement]:
    unlocked = []
    existing = {badge.badge_id for badge in _get_unlocked_badges(db, student_pk)}
    candidates = []
    if "first_steps" not in existing:
        candidates.append(("first_steps", GAMIFICATION_BADGES["first_steps"]["name"]))

    streak = _get_or_create_streak(db, student_pk)
    if streak.current >= 3:
        candidates.append(("three_day_streak", GAMIFICATION_BADGES["three_day_streak"]["name"]))
    if streak.current >= 7:
        candidates.append(("seven_day_streak", GAMIFICATION_BADGES["seven_day_streak"]["name"]))
    if action == "mistake_corrected":
        candidates.append(("mistake_fixer", GAMIFICATION_BADGES["mistake_fixer"]["name"]))
    if action == "weak_topic_revisited":
        candidates.append(("comeback", GAMIFICATION_BADGES["comeback"]["name"]))
    if action == "knowledge_transfer":
        candidates.append(("transfer_thinker", GAMIFICATION_BADGES["transfer_thinker"]["name"]))
    if topic and meta.get("mastery") is not None and mastery_band_label(float(meta["mastery"])) in {
        "Understanding",
        "Strong",
        "Mastered",
    }:
        candidates.append((f"topic_explorer:{topic}", f"{_title(topic)} Explorer"))

    for badge_id, name in candidates:
        if badge_id in existing:
            continue
        badge = Achievement(student_id=student_pk, badge_id=badge_id, name=name)
        db.add(badge)
        db.commit()
        db.refresh(badge)
        existing.add(badge_id)
        unlocked.append(badge)
    return unlocked


def _get_unlocked_badges(db: Session, student_pk: int) -> list[Achievement]:
    return list(
        db.scalars(
            select(Achievement).where(Achievement.student_id == student_pk).order_by(Achievement.unlocked_at)
        ).all()
    )


def _recent_xp_events(db: Session, student_pk: int, limit: int = 10) -> list[StudentXP]:
    return list(
        db.scalars(
            select(StudentXP)
            .where(StudentXP.student_id == student_pk)
            .order_by(desc(StudentXP.created_at), desc(StudentXP.id))
            .limit(limit)
        ).all()
    )


def _today_local() -> date:
    return datetime.now(_streak_timezone()).date()


def _today_bounds_utc() -> tuple[datetime, datetime]:
    tz = _streak_timezone()
    today = datetime.now(tz).date()
    start_local = datetime(today.year, today.month, today.day, tzinfo=tz)
    end_local = start_local + timedelta(days=1)
    return (
        start_local.astimezone(timezone.utc).replace(tzinfo=None),
        end_local.astimezone(timezone.utc).replace(tzinfo=None),
    )


def _streak_timezone():
    try:
        return ZoneInfo(GAMIFICATION_STREAK_TIMEZONE)
    except ZoneInfoNotFoundError:
        if GAMIFICATION_STREAK_TIMEZONE == "Asia/Kolkata":
            return timezone(timedelta(hours=5, minutes=30), "Asia/Kolkata")
        return timezone.utc


def _title(topic: str) -> str:
    return " ".join(part.capitalize() for part in topic.replace("-", " ").split())


def _empty_award(reason: str) -> GamificationAwardRead:
    return GamificationAwardRead(
        xp_awarded=0,
        new_total=0,
        level_up=False,
        badges_unlocked=[],
        reason=reason,
    )

"""Shared constants for ATLAS backend."""

SUPPORTED_LLM_MODES = {"mock", "foundry"}

MASTERY_SCORE_DELTAS = {
    "correct_independently": 0.10,
    "correct_with_hint": 0.05,
    "incorrect": -0.05,
    "repeated_misconception": -0.10,
    "correct_new_context": 0.10,
}

MASTERY_BANDS = [
    {"min": 0.0, "max": 0.30, "label": "Needs foundational teaching"},
    {"min": 0.31, "max": 0.50, "label": "Developing"},
    {"min": 0.51, "max": 0.70, "label": "Understanding"},
    {"min": 0.71, "max": 0.85, "label": "Strong"},
    {"min": 0.86, "max": 1.0, "label": "Mastered"},
]

CONFIDENCE_SIGNAL_STEPS = {
    "independent_success": 0.05,
    "independent_attempt": 0.03,
    "i_dont_know": -0.04,
    "repeated_confirmation": -0.03,
    "giving_up_immediately": -0.05,
    "successful_transfer": 0.05,
}

ADAPTABILITY_TRANSFER_SUCCESS_STEP = 0.07

GAMIFICATION_STREAK_TIMEZONE = "Asia/Kolkata"

GAMIFICATION_XP_ACTIONS = {
    "notes_completed": 20,
    "practice_question_attempted": 5,
    "hard_question_attempted": 10,
    "practice_completed": 40,
    "revision_completed": 30,
    "flashcard_reviewed": 5,
    "mistake_corrected": 15,
    "weak_topic_revisited": 10,
    "knowledge_transfer": 15,
    "focus_session_completed": 50,
}

GAMIFICATION_DAILY_XP_CAPS = {
    "notes_completed": 100,
    "practice_question_attempted": 80,
    "hard_question_attempted": 60,
    "practice_completed": 120,
    "revision_completed": 90,
    "flashcard_reviewed": 80,
    "mistake_corrected": 75,
    "weak_topic_revisited": 50,
    "knowledge_transfer": 75,
    "focus_session_completed": 100,
}

GAMIFICATION_LEVEL_THRESHOLDS = [0, 100, 250, 450, 700, 1000]

GAMIFICATION_DAILY_GOAL_TARGETS = {
    "notes": 20,
    "practice": 40,
    "focus": 50,
}

GAMIFICATION_ACTION_CATEGORIES = {
    "notes_completed": "notes",
    "practice_question_attempted": "practice",
    "hard_question_attempted": "practice",
    "practice_completed": "practice",
    "revision_completed": "practice",
    "flashcard_reviewed": "practice",
    "mistake_corrected": "practice",
    "weak_topic_revisited": "practice",
    "knowledge_transfer": "practice",
    "focus_session_completed": "focus",
}

# Phase 6 focus mode
FOCUS_ALLOWED_DURATIONS_MINUTES = [25, 45, 60]
FOCUS_CUSTOM_DURATION_MIN_MINUTES = 5
FOCUS_CUSTOM_DURATION_MAX_MINUTES = 180
FOCUS_COMPLETION_THRESHOLD = 0.80
FOCUS_ABANDON_GRACE_MINUTES = 10
# Spec section 20: 45-minute session split as percentages of the total duration (sums to 100).
FOCUS_PHASE_SPLIT_PERCENT = {
    "quick_revision": 11,
    "learn": 34,
    "practice": 22,
    "notes_revision": 18,
    "mini_assessment": 11,
    "reflection": 4,
}
# Percentage points shifted between learning and practice/assessment for adapted mastery bands.
FOCUS_MASTERY_LEARN_SHIFT_PERCENT = 10

# Phase 6b pomodoro mode (spec section 22)
FOCUS_POMODORO_PRESETS = {
    "25/5": {"study_minutes": 25, "break_minutes": 5},
    "45/10": {"study_minutes": 45, "break_minutes": 10},
}
FOCUS_POMODORO_STUDY_MIN_MINUTES = 5
FOCUS_POMODORO_STUDY_MAX_MINUTES = 90
FOCUS_POMODORO_BREAK_MIN_MINUTES = 1
FOCUS_POMODORO_BREAK_MAX_MINUTES = 30
FOCUS_POMODORO_ROUNDS_MIN = 1
FOCUS_POMODORO_ROUNDS_MAX = 8

GAMIFICATION_BADGES = {
    "first_steps": {
        "name": "First Steps",
        "criteria": "Earn XP for the first time.",
    },
    "three_day_streak": {
        "name": "3-Day Streak",
        "criteria": "Earn XP on three consecutive days.",
    },
    "seven_day_streak": {
        "name": "7-Day Streak",
        "criteria": "Earn XP on seven consecutive days.",
    },
    "mistake_fixer": {
        "name": "Mistake Fixer",
        "criteria": "Correct a previously recorded misconception.",
    },
    "comeback": {
        "name": "Comeback",
        "criteria": "Return to a weak topic.",
    },
    "transfer_thinker": {
        "name": "Transfer Thinker",
        "criteria": "Demonstrate knowledge transfer.",
    },
}

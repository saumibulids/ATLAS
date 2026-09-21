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

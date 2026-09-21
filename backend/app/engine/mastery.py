"""Pure mastery scoring functions."""

from app.core.constants import MASTERY_BANDS, MASTERY_SCORE_DELTAS


def apply_mastery_event(current_score: float, event: str) -> float:
    """Apply one observable mastery event to a concept score."""
    if event not in MASTERY_SCORE_DELTAS:
        raise ValueError(f"Unknown mastery event: {event}")
    return _clamp_score(current_score + MASTERY_SCORE_DELTAS[event])


def mastery_band_label(score: float) -> str:
    """Return the configured band label for a mastery score from 0.0 to 1.0."""
    clamped_score = _clamp_score(score)
    percentage = round(clamped_score * 100)
    normalized_score = percentage / 100

    for band in MASTERY_BANDS:
        if band["min"] <= normalized_score <= band["max"]:
            return band["label"]
    return MASTERY_BANDS[-1]["label"]


def _clamp_score(score: float) -> float:
    return min(1.0, max(0.0, round(score, 4)))

"""Pure adaptability scoring functions."""

from app.core.constants import ADAPTABILITY_TRANSFER_SUCCESS_STEP


def adjust_adaptability_for_transfer(
    current_adaptability: float,
    *,
    succeeded: bool,
) -> float:
    """Raise adaptability when a student succeeds on a transfer question."""
    if not succeeded:
        return _clamp_score(current_adaptability)
    return _clamp_score(current_adaptability + ADAPTABILITY_TRANSFER_SUCCESS_STEP)


def _clamp_score(score: float) -> float:
    return min(1.0, max(0.0, round(score, 4)))

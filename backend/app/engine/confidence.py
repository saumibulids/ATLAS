"""Pure confidence scoring functions from observable learning signals."""

from app.core.constants import CONFIDENCE_SIGNAL_STEPS


def adjust_confidence(current_confidence: float, signal: str) -> float:
    """Adjust confidence using observable behavior only."""
    if signal not in CONFIDENCE_SIGNAL_STEPS:
        raise ValueError(f"Unknown confidence signal: {signal}")
    return _clamp_score(current_confidence + CONFIDENCE_SIGNAL_STEPS[signal])


def _clamp_score(score: float) -> float:
    return min(1.0, max(0.0, round(score, 4)))

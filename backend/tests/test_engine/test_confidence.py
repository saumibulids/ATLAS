"""Tests for pure confidence engine functions."""

import pytest

from app.engine.confidence import adjust_confidence


def test_adjust_confidence_from_observable_positive_signals():
    assert adjust_confidence(0.50, "independent_success") == 0.55
    assert adjust_confidence(0.50, "independent_attempt") == 0.53
    assert adjust_confidence(0.50, "successful_transfer") == 0.55


def test_adjust_confidence_from_observable_negative_signals():
    assert adjust_confidence(0.50, "i_dont_know") == 0.46
    assert adjust_confidence(0.50, "repeated_confirmation") == 0.47
    assert adjust_confidence(0.50, "giving_up_immediately") == 0.45


def test_adjust_confidence_clamps_at_zero_and_one():
    assert adjust_confidence(0.98, "successful_transfer") == 1.0
    assert adjust_confidence(0.02, "giving_up_immediately") == 0.0


def test_unknown_confidence_signal_raises():
    with pytest.raises(ValueError):
        adjust_confidence(0.5, "anxiety")

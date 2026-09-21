"""Tests for pure mastery engine functions."""

import pytest

from app.engine.mastery import apply_mastery_event, mastery_band_label


def test_apply_mastery_event_uses_spec_scoring():
    assert apply_mastery_event(0.50, "correct_independently") == 0.60
    assert apply_mastery_event(0.50, "correct_with_hint") == 0.55
    assert apply_mastery_event(0.50, "incorrect") == 0.45
    assert apply_mastery_event(0.50, "correct_new_context") == 0.60


def test_repeated_misconception_penalty():
    assert apply_mastery_event(0.50, "repeated_misconception") == 0.40


def test_apply_mastery_event_clamps_at_zero_and_one():
    assert apply_mastery_event(0.98, "correct_independently") == 1.0
    assert apply_mastery_event(0.03, "incorrect") == 0.0


def test_mastery_band_label_uses_configured_ranges():
    assert mastery_band_label(0.30) == "Needs foundational teaching"
    assert mastery_band_label(0.31) == "Developing"
    assert mastery_band_label(0.51) == "Understanding"
    assert mastery_band_label(0.71) == "Strong"
    assert mastery_band_label(0.86) == "Mastered"


def test_unknown_mastery_event_raises():
    with pytest.raises(ValueError):
        apply_mastery_event(0.5, "diagnose_student")

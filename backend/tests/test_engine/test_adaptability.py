"""Tests for pure adaptability engine functions."""

from app.engine.adaptability import adjust_adaptability_for_transfer


def test_successful_transfer_raises_adaptability():
    assert adjust_adaptability_for_transfer(0.50, succeeded=True) == 0.57


def test_unsuccessful_transfer_keeps_adaptability_unchanged():
    assert adjust_adaptability_for_transfer(0.50, succeeded=False) == 0.50


def test_adjust_adaptability_clamps_at_zero_and_one():
    assert adjust_adaptability_for_transfer(0.98, succeeded=True) == 1.0
    assert adjust_adaptability_for_transfer(-0.10, succeeded=False) == 0.0

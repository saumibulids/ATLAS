"""Tests for pure misconception helpers."""

from app.engine.misconceptions import add_misconception


def test_add_misconception_appends_new_item():
    updated, repeated = add_misconception([], "confuses MAC and IP addressing")

    assert updated == ["confuses MAC and IP addressing"]
    assert repeated is False


def test_add_misconception_deduplicates_and_detects_repeat():
    existing = ["confuses MAC and IP addressing"]

    updated, repeated = add_misconception(existing, "Confuses MAC and IP Addressing")

    assert updated == existing
    assert repeated is True


def test_add_misconception_ignores_blank_text():
    updated, repeated = add_misconception(["subnet calculation errors"], " ")

    assert updated == ["subnet calculation errors"]
    assert repeated is False

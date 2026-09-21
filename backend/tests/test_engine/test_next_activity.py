"""Tests for pure next-activity recommendations."""

from app.engine.next_activity import recommend_next_activity


def test_open_misconceptions_recommend_revision():
    recommendation = recommend_next_activity(
        {
            "topic": "Routing",
            "mastery": 0.80,
            "misconceptions": ["confuses routing table with MAC table"],
        }
    )

    assert recommendation["activity"] == "revise"
    assert recommendation["topic"] == "Routing"
    assert "misconceptions" in recommendation["reason"]


def test_foundational_mastery_recommends_notes():
    recommendation = recommend_next_activity({"topic": "Routing", "mastery": 0.25})

    assert recommendation["activity"] == "notes"
    assert recommendation["topic"] == "Routing"


def test_developing_mastery_recommends_practice():
    recommendation = recommend_next_activity({"topic": "Routing", "mastery": 0.45})

    assert recommendation["activity"] == "practice"


def test_strong_mastery_recommends_challenge():
    recommendation = recommend_next_activity({"topic": "Routing", "mastery": 0.86})

    assert recommendation["activity"] == "challenge"


def test_recommendation_uses_lowest_concept_score_when_topic_missing():
    recommendation = recommend_next_activity(
        {"concept_scores": {"switching": 0.82, "routing": 0.42}}
    )

    assert recommendation["topic"] == "routing"
    assert recommendation["activity"] == "practice"

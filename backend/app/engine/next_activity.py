"""Pure next-activity recommendation functions."""

from typing import Any

from app.engine.mastery import mastery_band_label

ActivityRecommendation = dict[str, str]


def recommend_next_activity(learning_state: dict[str, Any]) -> ActivityRecommendation:
    """Recommend the next activity from current state, without mutating state."""
    topic = _select_topic(learning_state)
    mastery = _select_mastery(learning_state, topic)
    open_misconceptions = _open_misconceptions(learning_state)

    if open_misconceptions:
        return {
            "activity": "revise",
            "topic": topic,
            "reason": "Open misconceptions should be revisited before moving on.",
        }

    band = mastery_band_label(mastery)
    if band == "Needs foundational teaching":
        activity = "notes"
        reason = "Mastery is in the foundational band, so a short concept review is best."
    elif band in {"Developing", "Understanding"}:
        activity = "practice"
        reason = f"Mastery is {band.lower()}, so practice can strengthen the concept."
    else:
        activity = "challenge"
        reason = f"Mastery is {band.lower()}, so a transfer challenge is appropriate."

    return {"activity": activity, "topic": topic, "reason": reason}


def _select_topic(learning_state: dict[str, Any]) -> str:
    topic = learning_state.get("topic")
    if topic:
        return str(topic)

    concept_scores = learning_state.get("concept_scores") or {}
    if concept_scores:
        return min(concept_scores, key=concept_scores.get)

    return "current topic"


def _select_mastery(learning_state: dict[str, Any], topic: str) -> float:
    concept_scores = learning_state.get("concept_scores") or {}
    if topic in concept_scores:
        return float(concept_scores[topic])
    return float(learning_state.get("mastery", 0.0))


def _open_misconceptions(learning_state: dict[str, Any]) -> list[str]:
    for key in ("open_misconceptions", "misconceptions", "mistakes"):
        misconceptions = learning_state.get(key)
        if misconceptions:
            return list(misconceptions)
    return []

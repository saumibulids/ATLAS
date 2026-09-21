"""Curriculum and cascading notes services."""

from sqlalchemy.orm import Session

from app.database.repositories.curriculum_repository import (
    get_subject_topics,
    get_subjects,
    get_topic_with_concepts,
)
from app.database.repositories.student_repository import get_student_with_state
from app.schemas.curriculum import SubjectRead, TopicRead
from app.schemas.notes import NoteLevelRead, TopicNotesRead


STANDARD_LEVELS = [
    ("overview", "overview"),
    ("core_concept", "core_concept"),
    ("explanation", "explanation"),
    ("example", "example"),
    ("common_mistake", "common_mistake"),
    ("quick_check", "quick_check"),
    ("practice_prompt", "practice_prompt"),
]
SIMPLE_LEVELS = [
    ("concept", "core_concept"),
    ("simple_explanation", "simple_explanation"),
    ("analogy", "analogy"),
    ("example", "example"),
    ("practice", "practice_prompt"),
]
ADVANCED_LEVELS = [
    ("concept", "core_concept"),
    ("advanced_example", "advanced_example"),
    ("edge_case", "edge_case"),
    ("challenge", "challenge_question"),
]


def list_subjects(db: Session) -> list[SubjectRead]:
    return [SubjectRead.model_validate(subject, from_attributes=True) for subject in get_subjects(db)]


def list_topics_for_subject(db: Session, subject_id: int) -> list[TopicRead] | None:
    topics = get_subject_topics(db, subject_id)
    if topics is None:
        return None
    return [TopicRead.model_validate(topic, from_attributes=True) for topic in topics]


def get_topic_notes(db: Session, topic_id: int, student_id: str) -> TopicNotesRead | None:
    topic = get_topic_with_concepts(db, topic_id)
    student = get_student_with_state(db, student_id)
    if topic is None or student is None or student.learning_state is None:
        return None

    notes = topic.notes or {}
    score = _topic_score(student.learning_state, topic)
    variant, level_names = _variant_for_score(score)
    mistakes = student.learning_state.mistakes or []
    return TopicNotesRead(
        topic_id=topic.id,
        topic=topic.title,
        variant=variant,
        levels=[
            _build_level(notes, response_level, source_level, mistakes)
            for response_level, source_level in level_names
        ],
    )


def _topic_score(learning_state, topic) -> float:
    concept_scores = learning_state.concept_scores or {}
    return float(concept_scores.get(topic.slug, concept_scores.get(topic.title.lower(), learning_state.mastery)))


def _variant_for_score(score: float) -> tuple[str, list[tuple[str, str]]]:
    if score <= 0.50:
        return "simple", SIMPLE_LEVELS
    if score >= 0.71:
        return "advanced", ADVANCED_LEVELS
    return "standard", STANDARD_LEVELS


def _build_level(
    notes: dict,
    response_level: str,
    source_level: str,
    mistakes: list[str],
) -> NoteLevelRead:
    value = notes.get(source_level, "")
    if isinstance(value, dict):
        content = value.get("content", "")
        question = value.get("question")
        answer = value.get("answer")
        misconception = value.get("misconception")
    else:
        content = str(value)
        question = None
        answer = None
        misconception = None

    return NoteLevelRead(
        level=response_level,
        content=content,
        question=question,
        answer=answer,
        misconception_flag=_has_misconception(mistakes, misconception),
    )


def _has_misconception(mistakes: list[str], misconception: str | None) -> bool:
    if not misconception:
        return False
    return any(mistake.casefold() == misconception.casefold() for mistake in mistakes)

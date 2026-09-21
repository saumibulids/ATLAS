"""Repository helpers for assessments and question bank."""

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.assessment import Answer, Assessment, Question
from app.models.student import Student


def upsert_question(db: Session, data: dict) -> Question:
    question = db.scalars(select(Question).where(Question.source_id == data["source_id"])).first()
    if question is None:
        question = Question(source_id=data["source_id"])
        db.add(question)

    question.question_type = data["type"]
    question.topic_slug = data["topic_slug"]
    question.concept_slug = data["concept_slug"]
    question.difficulty = data["difficulty"]
    question.prompt = data["prompt"]
    question.options = data.get("options", [])
    question.correct_answer = str(data["correct_answer"])
    question.hint = data["hint"]
    question.explanation = data["explanation"]
    question.misconception_tags = data.get("misconception_tags", {})
    question.keywords = data.get("keywords", [])
    question.numerical_tolerance = data.get("numerical_tolerance", 0.0)
    db.commit()
    db.refresh(question)
    return question


def get_questions_for_topic(db: Session, topic_slug: str) -> list[Question]:
    statement = (
        select(Question)
        .where(Question.topic_slug == topic_slug)
        .order_by(Question.difficulty, Question.id)
    )
    return list(db.scalars(statement).all())


def get_questions_by_ids(db: Session, question_ids: list[int]) -> list[Question]:
    if not question_ids:
        return []
    questions = list(db.scalars(select(Question).where(Question.id.in_(question_ids))).all())
    by_id = {question.id: question for question in questions}
    return [by_id[question_id] for question_id in question_ids if question_id in by_id]


def create_assessment(
    db: Session,
    *,
    student: Student,
    topic_slug: str,
    question_ids: list[int],
) -> Assessment:
    assessment = Assessment(
        student_id=student.id,
        topic_slug=topic_slug,
        question_ids=question_ids,
    )
    db.add(assessment)
    db.commit()
    db.refresh(assessment)
    return assessment


def get_assessment(db: Session, assessment_id: int) -> Assessment | None:
    return db.get(Assessment, assessment_id)


def create_answer(
    db: Session,
    *,
    assessment_id: int,
    question_id: int,
    answer: str,
    hint_used: bool,
    time_seconds: float | None,
    correct: bool,
    misconception_tag: str | None,
) -> Answer:
    answer_record = Answer(
        assessment_id=assessment_id,
        question_id=question_id,
        answer=answer,
        hint_used=hint_used,
        time_seconds=time_seconds,
        correct=correct,
        misconception_tag=misconception_tag,
    )
    db.add(answer_record)
    db.commit()
    db.refresh(answer_record)
    return answer_record


def mark_assessment_submitted(db: Session, assessment: Assessment) -> Assessment:
    assessment.submitted = True
    assessment.submitted_at = datetime.utcnow()
    db.add(assessment)
    db.commit()
    db.refresh(assessment)
    return assessment

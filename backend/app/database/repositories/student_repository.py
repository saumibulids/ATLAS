"""Repository helpers for student persistence."""

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.learning_state import LearningState
from app.models.student import Student


def get_student_with_state(db: Session, student_id: str) -> Student | None:
    statement = (
        select(Student)
        .where(Student.student_id == student_id)
        .options(selectinload(Student.learning_state))
    )
    return db.scalars(statement).first()


def create_student(
    db: Session,
    *,
    name: str,
    grade: int | None,
    language: str,
    explanation_style: str,
) -> Student:
    student = Student(
        student_id=_next_student_id(db),
        name=name,
        grade=grade,
        language=language,
        explanation_style=explanation_style,
        preferences={"explanation_style": explanation_style},
    )
    student.learning_state = LearningState(
        mastery=0.0,
        confidence=0.0,
        adaptability=0.0,
        pace="medium",
        concept_scores={},
        mistakes=[],
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


def update_student(db: Session, student: Student, updates: dict) -> Student:
    for field, value in updates.items():
        setattr(student, field, value)
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


def create_demo_student(db: Session) -> Student:
    existing = get_student_with_state(db, "S001")
    if existing:
        return existing

    student = Student(
        student_id="S001",
        name="Demo Student",
        grade=None,
        language="Hinglish",
        explanation_style="examples",
        preferences={"explanation_style": "examples"},
        subject="Computer Networks",
        topic="Routing",
    )
    student.learning_state = LearningState(
        mastery=0.64,
        confidence=0.55,
        adaptability=0.71,
        pace="medium",
        concept_scores={"routing": 0.64},
        mistakes=[],
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


def _next_student_id(db: Session) -> str:
    student_ids = db.scalars(select(Student.student_id)).all()
    numeric_ids = [
        int(student_id[1:])
        for student_id in student_ids
        if student_id.startswith("S") and student_id[1:].isdigit()
    ]
    next_id = max(numeric_ids, default=0) + 1
    return f"S{next_id:03d}"

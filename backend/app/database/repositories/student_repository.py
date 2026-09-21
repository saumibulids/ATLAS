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


def create_demo_student(db: Session) -> Student:
    existing = get_student_with_state(db, "S001")
    if existing:
        return existing

    student = Student(
        student_id="S001",
        name="Demo Student",
        grade=None,
        language="Hinglish",
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

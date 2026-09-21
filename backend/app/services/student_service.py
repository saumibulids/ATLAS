"""Student service layer."""

from sqlalchemy.orm import Session

from app.database.repositories.student_repository import get_student_with_state
from app.schemas.student import CurrentLearning, StudentRead


def get_student_profile(db: Session, student_id: str) -> StudentRead | None:
    student = get_student_with_state(db, student_id)
    if student is None or student.learning_state is None:
        return None

    return StudentRead(
        student_id=student.student_id,
        name=student.name,
        grade=student.grade,
        language=student.language,
        current_learning=CurrentLearning(subject=student.subject, topic=student.topic),
        learning_state=student.learning_state,
    )

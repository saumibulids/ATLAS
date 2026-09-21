"""Seed the development database with a demo student."""

from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.database.database import SessionLocal, init_db
from app.database.repositories.student_repository import create_demo_student
from scripts.seed_curriculum import seed_curriculum
from scripts.seed_flashcards import seed_flashcards
from scripts.seed_questions import seed_questions


def main() -> None:
    init_db()
    db = SessionLocal()
    try:
        student = create_demo_student(db)
        print(f"Seeded demo student: {student.student_id}")
    finally:
        db.close()
    seed_curriculum()
    seed_questions()
    seed_flashcards()


if __name__ == "__main__":
    main()

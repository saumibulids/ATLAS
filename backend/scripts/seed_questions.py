"""Seed assessment question bank from JSON files."""

import json
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.database.database import SessionLocal, init_db
from app.database.repositories.assessment_repository import upsert_question

QUESTIONS_DIR = (
    Path(__file__).resolve().parents[2]
    / "content"
    / "curriculum"
    / "computer_networks"
    / "questions"
)


def seed_questions() -> None:
    init_db()
    db = SessionLocal()
    try:
        for path in sorted(QUESTIONS_DIR.glob("*.json")):
            questions = json.loads(path.read_text(encoding="utf-8"))
            for question in questions:
                upsert_question(db, question)
        print("Seeded assessment questions: Computer Networks")
    finally:
        db.close()


if __name__ == "__main__":
    seed_questions()

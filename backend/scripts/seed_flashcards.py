"""Seed flashcard bank from JSON files."""

import json
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.database.database import SessionLocal, init_db
from app.database.repositories.flashcard_repository import upsert_flashcard

FLASHCARDS_DIR = (
    Path(__file__).resolve().parents[2]
    / "content"
    / "curriculum"
    / "computer_networks"
    / "flashcards"
)


def seed_flashcards() -> None:
    init_db()
    db = SessionLocal()
    try:
        for path in sorted(FLASHCARDS_DIR.glob("*.json")):
            cards = json.loads(path.read_text(encoding="utf-8"))
            for card in cards:
                upsert_flashcard(db, card)
        print("Seeded flashcards: Computer Networks")
    finally:
        db.close()


if __name__ == "__main__":
    seed_flashcards()

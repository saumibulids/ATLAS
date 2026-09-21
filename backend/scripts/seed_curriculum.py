"""Seed curriculum content from JSON files."""

import json
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.database.database import SessionLocal, init_db
from app.database.repositories.curriculum_repository import (
    replace_topic_concepts,
    upsert_subject,
    upsert_topic,
)

CONTENT_DIR = Path(__file__).resolve().parents[2] / "content" / "curriculum" / "computer_networks"


def seed_curriculum() -> None:
    init_db()
    db = SessionLocal()
    try:
        subject = upsert_subject(
            db,
            name="Computer Networks",
            slug="computer-networks",
            description="Foundational computer networking concepts.",
        )
        for path in sorted(CONTENT_DIR.glob("*.json")):
            data = json.loads(path.read_text(encoding="utf-8"))
            topic = upsert_topic(
                db,
                subject=subject,
                title=data["title"],
                slug=data["slug"],
                summary=data.get("summary"),
                notes=data["notes"],
            )
            replace_topic_concepts(db, topic, data["concepts"])
        print("Seeded curriculum: Computer Networks")
    finally:
        db.close()


if __name__ == "__main__":
    seed_curriculum()

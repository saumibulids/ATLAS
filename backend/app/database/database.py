"""SQLAlchemy database setup and session dependency."""

from collections.abc import Generator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import get_settings


class Base(DeclarativeBase):
    pass


settings = get_settings()
connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def import_models() -> None:
    from app.models.assessment import Answer, Assessment, Question  # noqa: F401
    from app.models.curriculum import Concept, Subject, Topic  # noqa: F401
    from app.models.flashcard import Flashcard, FlashcardReview  # noqa: F401
    from app.models.learning_event import LearningEvent  # noqa: F401
    from app.models.learning_state import LearningState  # noqa: F401
    from app.models.session import Message, Session  # noqa: F401
    from app.models.student import Student  # noqa: F401


def init_db() -> None:
    import_models()
    Base.metadata.create_all(bind=engine)
    _ensure_phase2_columns()


def _ensure_phase2_columns() -> None:
    if not settings.database_url.startswith("sqlite"):
        return

    inspector = inspect(engine)
    if "students" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("students")}
    statements = []
    if "explanation_style" not in existing_columns:
        statements.append("ALTER TABLE students ADD COLUMN explanation_style VARCHAR(64) DEFAULT 'examples'")
    if "preferences" not in existing_columns:
        statements.append("ALTER TABLE students ADD COLUMN preferences JSON DEFAULT '{}'")

    if not statements:
        return

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

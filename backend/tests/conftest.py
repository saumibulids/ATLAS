"""Shared pytest setup for the ATLAS backend."""

import os
import tempfile

os.environ["ATLAS_LLM_MODE"] = "mock"
os.environ["DATABASE_URL"] = f"sqlite:///{tempfile.NamedTemporaryFile(delete=False).name}"

import pytest
from fastapi.testclient import TestClient

from app.database.database import Base, SessionLocal, engine, init_db
from app.database.repositories.student_repository import create_demo_student
from app.main import app


@pytest.fixture(autouse=True)
def reset_database():
    init_db()
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        create_demo_student(db)
    finally:
        db.close()
    yield


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)

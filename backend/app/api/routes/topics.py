"""Curriculum and cascading notes API routes."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.schemas.curriculum import SubjectRead, TopicRead
from app.schemas.notes import TopicNotesRead
from app.services.notes_service import get_topic_notes, list_subjects, list_topics_for_subject

router = APIRouter(prefix="/api", tags=["curriculum"])


@router.get("/subjects", response_model=list[SubjectRead])
def read_subjects(db: Session = Depends(get_db)) -> list[SubjectRead]:
    return list_subjects(db)


@router.get("/subjects/{subject_id}/topics", response_model=list[TopicRead])
def read_subject_topics(subject_id: int, db: Session = Depends(get_db)) -> list[TopicRead]:
    topics = list_topics_for_subject(db, subject_id)
    if topics is None:
        raise HTTPException(status_code=404, detail="Subject not found")
    return topics


@router.get("/topics/{topic_id}/notes", response_model=TopicNotesRead)
def read_topic_notes(
    topic_id: int,
    student_id: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
) -> TopicNotesRead:
    notes = get_topic_notes(db, topic_id, student_id)
    if notes is None:
        raise HTTPException(status_code=404, detail="Topic or student not found")
    return notes

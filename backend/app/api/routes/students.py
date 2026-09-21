"""Student API routes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.schemas.progress import NextActivityRead, ProgressRead
from app.schemas.student import SessionRead, StudentCreate, StudentPatch, StudentRead
from app.services.student_service import (
    create_student_profile,
    get_student_profile,
    get_student_next_activity,
    get_student_progress,
    list_student_sessions,
    update_student_profile,
)

router = APIRouter(prefix="/api/students", tags=["students"])


@router.post("", response_model=StudentRead, status_code=201)
def create_student(payload: StudentCreate, db: Session = Depends(get_db)) -> StudentRead:
    return create_student_profile(db, payload)


@router.get("/{student_id}", response_model=StudentRead)
def read_student(student_id: str, db: Session = Depends(get_db)) -> StudentRead:
    student = get_student_profile(db, student_id)
    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")
    return student


@router.patch("/{student_id}", response_model=StudentRead)
def patch_student(
    student_id: str,
    payload: StudentPatch,
    db: Session = Depends(get_db),
) -> StudentRead:
    student = update_student_profile(db, student_id, payload)
    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")
    return student


@router.get("/{student_id}/sessions", response_model=list[SessionRead])
def read_student_sessions(student_id: str, db: Session = Depends(get_db)) -> list[SessionRead]:
    sessions = list_student_sessions(db, student_id)
    if sessions is None:
        raise HTTPException(status_code=404, detail="Student not found")
    return sessions


@router.get("/{student_id}/progress", response_model=ProgressRead)
def read_student_progress(student_id: str, db: Session = Depends(get_db)) -> ProgressRead:
    progress = get_student_progress(db, student_id)
    if progress is None:
        raise HTTPException(status_code=404, detail="Student not found")
    return progress


@router.get("/{student_id}/next-activity", response_model=NextActivityRead)
def read_student_next_activity(
    student_id: str,
    db: Session = Depends(get_db),
) -> NextActivityRead:
    recommendation = get_student_next_activity(db, student_id)
    if recommendation is None:
        raise HTTPException(status_code=404, detail="Student not found")
    return recommendation

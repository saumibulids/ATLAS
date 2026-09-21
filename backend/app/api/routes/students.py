"""Student API routes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.schemas.student import StudentRead
from app.services.student_service import get_student_profile

router = APIRouter(prefix="/api/students", tags=["students"])


@router.get("/{student_id}", response_model=StudentRead)
def read_student(student_id: str, db: Session = Depends(get_db)) -> StudentRead:
    student = get_student_profile(db, student_id)
    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")
    return student

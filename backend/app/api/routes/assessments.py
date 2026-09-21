"""Assessment API routes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.schemas.assessment import (
    AssessmentCreateRequest,
    AssessmentCreateResponse,
    AssessmentSubmitRequest,
    AssessmentSubmitResponse,
)
from app.services.assessment_service import (
    AssessmentAlreadySubmittedError,
    create_assessment_for_student,
    submit_assessment_answers,
)

router = APIRouter(prefix="/api/assessments", tags=["assessments"])


@router.post("", response_model=AssessmentCreateResponse)
def create_assessment(
    payload: AssessmentCreateRequest,
    db: Session = Depends(get_db),
) -> AssessmentCreateResponse:
    assessment = create_assessment_for_student(db, payload)
    if assessment is None:
        raise HTTPException(status_code=404, detail="Student or topic questions not found")
    return assessment


@router.post("/{assessment_id}/submit", response_model=AssessmentSubmitResponse)
def submit_assessment(
    assessment_id: int,
    payload: AssessmentSubmitRequest,
    db: Session = Depends(get_db),
) -> AssessmentSubmitResponse:
    try:
        response = submit_assessment_answers(db, assessment_id, payload)
    except AssessmentAlreadySubmittedError:
        raise HTTPException(status_code=409, detail="Assessment already submitted")
    if response is None:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return response

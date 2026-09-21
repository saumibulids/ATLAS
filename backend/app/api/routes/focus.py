"""Focus API routes for Phase 6a (single focus sessions)."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.schemas.focus import (
    FocusCompleteRequest,
    FocusCompleteResponse,
    FocusInterruptResponse,
    FocusResumeResponse,
    FocusSessionRead,
    FocusStartRequest,
    FocusStartResponse,
)
from app.services.focus_service import (
    FocusSessionActiveError,
    FocusSessionEndedError,
    complete_focus_session,
    get_focus_session_state,
    interrupt_focus_session,
    resume_focus_session,
    start_focus_session,
)

router = APIRouter(prefix="/api/focus", tags=["focus"])


@router.post("/start", response_model=FocusStartResponse, status_code=201)
def start_focus(
    payload: FocusStartRequest,
    db: Session = Depends(get_db),
) -> FocusStartResponse:
    try:
        response = start_focus_session(
            db,
            student_id=payload.student_id,
            topic=payload.topic,
            mode=payload.mode,
            duration_minutes=payload.duration_minutes,
        )
    except FocusSessionActiveError:
        raise HTTPException(status_code=409, detail="An active focus session is already running for this student")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if response is None:
        raise HTTPException(status_code=404, detail="Student not found")
    return response


@router.get("/{session_id}", response_model=FocusSessionRead)
def read_focus_session(session_id: int, db: Session = Depends(get_db)) -> FocusSessionRead:
    state = get_focus_session_state(db, session_id)
    if state is None:
        raise HTTPException(status_code=404, detail="Focus session not found")
    return state


@router.post("/{session_id}/interrupt", response_model=FocusInterruptResponse)
def interrupt_focus(session_id: int, db: Session = Depends(get_db)) -> FocusInterruptResponse:
    try:
        response = interrupt_focus_session(db, session_id)
    except FocusSessionEndedError:
        raise HTTPException(status_code=409, detail="Focus session already ended")
    if response is None:
        raise HTTPException(status_code=404, detail="Focus session not found")
    return response


@router.post("/{session_id}/resume", response_model=FocusResumeResponse)
def resume_focus(session_id: int, db: Session = Depends(get_db)) -> FocusResumeResponse:
    try:
        response = resume_focus_session(db, session_id)
    except FocusSessionEndedError:
        raise HTTPException(status_code=409, detail="Focus session already ended")
    if response is None:
        raise HTTPException(status_code=404, detail="Focus session not found")
    return response


@router.post("/{session_id}/complete", response_model=FocusCompleteResponse)
def complete_focus(
    session_id: int,
    payload: FocusCompleteRequest,
    db: Session = Depends(get_db),
) -> FocusCompleteResponse:
    try:
        response = complete_focus_session(db, session_id, payload)
    except FocusSessionEndedError:
        raise HTTPException(status_code=409, detail="Focus session already ended")
    if response is None:
        raise HTTPException(status_code=404, detail="Focus session not found")
    return response
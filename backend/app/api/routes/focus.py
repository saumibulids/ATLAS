"""Focus API routes for Phase 6 (single focus sessions + Pomodoro + analytics)."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.schemas.focus import (
    FocusAnalyticsRead,
    FocusBreakResponse,
    FocusCompleteRequest,
    FocusCompleteResponse,
    FocusInterruptResponse,
    FocusResumeResponse,
    FocusSessionRead,
    FocusStartRequest,
    FocusStartResponse,
)
from app.services.focus_service import (
    FocusBreakTransitionError,
    FocusSessionActiveError,
    FocusSessionEndedError,
    complete_focus_session,
    end_focus_break,
    get_focus_analytics,
    get_focus_session_state,
    interrupt_focus_session,
    resume_focus_session,
    start_focus_break,
    start_focus_session,
)

router = APIRouter(prefix="/api/focus", tags=["focus"])

# Focus analytics lives under /api/students/{student_id}/focus/analytics, so it
# gets its own router without the /api/focus prefix.
analytics_router = APIRouter(prefix="/api", tags=["focus"])


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
            preset=payload.preset,
            study_minutes=payload.study_minutes,
            break_minutes=payload.break_minutes,
            rounds=payload.rounds,
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


@router.post("/{session_id}/break/start", response_model=FocusBreakResponse)
def start_break(session_id: int, db: Session = Depends(get_db)) -> FocusBreakResponse:
    try:
        response = start_focus_break(db, session_id)
    except FocusBreakTransitionError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    except FocusSessionEndedError:
        raise HTTPException(status_code=409, detail="Focus session already ended")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if response is None:
        raise HTTPException(status_code=404, detail="Focus session not found")
    return response


@router.post("/{session_id}/break/end", response_model=FocusBreakResponse)
def end_break(session_id: int, db: Session = Depends(get_db)) -> FocusBreakResponse:
    try:
        response = end_focus_break(db, session_id)
    except FocusBreakTransitionError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    except FocusSessionEndedError:
        raise HTTPException(status_code=409, detail="Focus session already ended")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
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


@analytics_router.get("/students/{student_id}/focus/analytics", response_model=FocusAnalyticsRead)
def student_focus_analytics(student_id: str, db: Session = Depends(get_db)) -> FocusAnalyticsRead:
    analytics = get_focus_analytics(db, student_id)
    if analytics is None:
        raise HTTPException(status_code=404, detail="Student not found")
    return analytics
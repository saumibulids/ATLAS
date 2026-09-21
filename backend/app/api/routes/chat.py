"""Chat API routes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.schemas.chat import ChatRequest, ChatResponse, MessageRead
from app.services.tutor_service import chat_with_atlas, get_session_message_history

router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
def create_chat_turn(payload: ChatRequest, db: Session = Depends(get_db)) -> ChatResponse:
    response = chat_with_atlas(db, payload)
    if response is None:
        raise HTTPException(status_code=404, detail="Student not found")
    return response


@router.get("/sessions/{session_id}/messages", response_model=list[MessageRead])
def read_session_messages(session_id: int, db: Session = Depends(get_db)) -> list[MessageRead]:
    messages = get_session_message_history(db, session_id)
    if messages is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return messages

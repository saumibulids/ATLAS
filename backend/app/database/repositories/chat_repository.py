"""Repository helpers for chat session and message persistence."""

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.models.session import Message, Session as ChatSession
from app.models.student import Student


def create_session(db: Session, student: Student, subject: str, topic: str) -> ChatSession:
    chat_session = ChatSession(student_id=student.id, subject=subject, topic=topic)
    db.add(chat_session)
    db.commit()
    db.refresh(chat_session)
    return chat_session


def add_message(db: Session, session_id: int, role: str, content: str) -> Message:
    message = Message(session_id=session_id, role=role, content=content)
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


def get_recent_history(db: Session, student: Student, limit: int = 10) -> list[Message]:
    statement = (
        select(Message)
        .join(ChatSession)
        .where(ChatSession.student_id == student.id)
        .order_by(desc(Message.created_at))
        .limit(limit)
    )
    messages = list(db.scalars(statement).all())
    return list(reversed(messages))

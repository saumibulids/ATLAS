"""Repository helpers for chat session and message persistence."""

from datetime import datetime, timedelta

from sqlalchemy import desc, select
from sqlalchemy.orm import Session, selectinload

from app.models.session import Message, Session as ChatSession
from app.models.student import Student


def create_session(db: Session, student: Student, subject: str, topic: str) -> ChatSession:
    chat_session = ChatSession(student_id=student.id, subject=subject, topic=topic)
    db.add(chat_session)
    db.commit()
    db.refresh(chat_session)
    return chat_session


def get_session(db: Session, session_id: int) -> ChatSession | None:
    statement = (
        select(ChatSession)
        .where(ChatSession.id == session_id)
        .options(selectinload(ChatSession.messages))
    )
    return db.scalars(statement).first()


def get_student_sessions(db: Session, student: Student) -> list[ChatSession]:
    statement = (
        select(ChatSession)
        .where(ChatSession.student_id == student.id)
        .order_by(desc(ChatSession.started_at))
    )
    return list(db.scalars(statement).all())


def get_active_session(
    db: Session,
    student: Student,
    subject: str,
    topic: str,
    timeout_minutes: int,
) -> ChatSession | None:
    statement = (
        select(ChatSession)
        .where(
            ChatSession.student_id == student.id,
            ChatSession.subject == subject,
            ChatSession.topic == topic,
        )
        .order_by(desc(ChatSession.started_at))
    )
    sessions = db.scalars(statement).all()
    cutoff = datetime.utcnow() - timedelta(minutes=timeout_minutes)

    for chat_session in sessions:
        last_message = get_last_message(db, chat_session.id)
        last_activity = last_message.created_at if last_message else chat_session.started_at
        if last_activity >= cutoff:
            return chat_session
    return None


def add_message(db: Session, session_id: int, role: str, content: str) -> Message:
    message = Message(session_id=session_id, role=role, content=content)
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


def get_last_message(db: Session, session_id: int) -> Message | None:
    statement = (
        select(Message)
        .where(Message.session_id == session_id)
        .order_by(desc(Message.created_at), desc(Message.id))
        .limit(1)
    )
    return db.scalars(statement).first()


def get_recent_history(db: Session, session_id: int, limit: int = 10) -> list[Message]:
    statement = (
        select(Message)
        .where(Message.session_id == session_id)
        .order_by(desc(Message.created_at), desc(Message.id))
        .limit(limit)
    )
    messages = list(db.scalars(statement).all())
    return list(reversed(messages))


def get_session_messages(db: Session, session_id: int) -> list[Message]:
    statement = (
        select(Message)
        .where(Message.session_id == session_id)
        .order_by(Message.created_at, Message.id)
    )
    return list(db.scalars(statement).all())

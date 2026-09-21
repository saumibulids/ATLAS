"""Repository helpers for curriculum persistence."""

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.curriculum import Concept, Subject, Topic


def get_subjects(db: Session) -> list[Subject]:
    statement = select(Subject).order_by(Subject.name)
    return list(db.scalars(statement).all())


def get_subject(db: Session, subject_id: int) -> Subject | None:
    return db.get(Subject, subject_id)


def get_subject_topics(db: Session, subject_id: int) -> list[Topic] | None:
    if get_subject(db, subject_id) is None:
        return None
    statement = select(Topic).where(Topic.subject_id == subject_id).order_by(Topic.title)
    return list(db.scalars(statement).all())


def get_topic_with_concepts(db: Session, topic_id: int) -> Topic | None:
    statement = (
        select(Topic)
        .where(Topic.id == topic_id)
        .options(selectinload(Topic.concepts), selectinload(Topic.subject))
    )
    return db.scalars(statement).first()


def upsert_subject(
    db: Session,
    *,
    name: str,
    slug: str,
    description: str | None,
) -> Subject:
    subject = db.scalars(select(Subject).where(Subject.slug == slug)).first()
    if subject is None:
        subject = Subject(name=name, slug=slug, description=description)
        db.add(subject)
    else:
        subject.name = name
        subject.description = description
    db.commit()
    db.refresh(subject)
    return subject


def upsert_topic(
    db: Session,
    *,
    subject: Subject,
    title: str,
    slug: str,
    summary: str | None,
    notes: dict,
) -> Topic:
    statement = select(Topic).where(Topic.subject_id == subject.id, Topic.slug == slug)
    topic = db.scalars(statement).first()
    if topic is None:
        topic = Topic(
            subject_id=subject.id,
            title=title,
            slug=slug,
            summary=summary,
            notes=notes,
        )
        db.add(topic)
    else:
        topic.title = title
        topic.summary = summary
        topic.notes = notes
    db.commit()
    db.refresh(topic)
    return topic


def replace_topic_concepts(db: Session, topic: Topic, concepts: list[dict]) -> None:
    existing = {concept.slug: concept for concept in topic.concepts}
    seen_slugs = set()
    for index, concept_data in enumerate(concepts):
        slug = concept_data["slug"]
        seen_slugs.add(slug)
        concept = existing.get(slug)
        if concept is None:
            concept = Concept(topic_id=topic.id, slug=slug)
            db.add(concept)
        concept.name = concept_data["name"]
        concept.description = concept_data.get("description")
        concept.order = index

    for slug, concept in existing.items():
        if slug not in seen_slugs:
            db.delete(concept)

    db.commit()

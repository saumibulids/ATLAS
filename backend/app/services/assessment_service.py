"""Assessment service layer."""

from sqlalchemy.orm import Session

from app.agents.foundry_agent import grade_short_answer_with_model
from app.core.config import get_settings
from app.database.repositories.assessment_repository import (
    create_answer,
    create_assessment,
    get_assessment,
    get_questions_by_ids,
    get_questions_for_topic,
    mark_assessment_submitted,
)
from app.database.repositories.learning_event_repository import create_learning_event
from app.database.repositories.student_repository import get_student_with_state
from app.engine.adaptability import adjust_adaptability_for_transfer
from app.engine.confidence import adjust_confidence
from app.engine.mastery import apply_mastery_event, mastery_band_label
from app.engine.misconceptions import add_misconception
from app.engine.next_activity import recommend_next_activity
from app.schemas.assessment import (
    AssessmentCreateRequest,
    AssessmentCreateResponse,
    AssessmentQuestionRead,
    AssessmentSubmitRequest,
    AssessmentSubmitResponse,
    QuestionResultRead,
    ScoreSummaryRead,
)


class AssessmentAlreadySubmittedError(Exception):
    """Raised when a submitted assessment is submitted again."""


def create_assessment_for_student(
    db: Session,
    payload: AssessmentCreateRequest,
) -> AssessmentCreateResponse | None:
    student = get_student_with_state(db, payload.student_id)
    if student is None or student.learning_state is None:
        return None

    topic_slug = _slugify(payload.topic)
    questions = get_questions_for_topic(db, topic_slug)
    if not questions:
        return None

    selected = _select_questions(questions, student.learning_state, topic_slug, payload.count)
    assessment = create_assessment(
        db,
        student=student,
        topic_slug=topic_slug,
        question_ids=[question.id for question in selected],
    )
    return AssessmentCreateResponse(
        assessment_id=assessment.id,
        student_id=student.student_id,
        topic_slug=topic_slug,
        questions=[_question_to_safe_response(question) for question in selected],
    )


def submit_assessment_answers(
    db: Session,
    assessment_id: int,
    payload: AssessmentSubmitRequest,
) -> AssessmentSubmitResponse | None:
    assessment = get_assessment(db, assessment_id)
    if assessment is None:
        return None
    if assessment.submitted:
        raise AssessmentAlreadySubmittedError()

    student = _student_by_internal_id(db, assessment.student_id)
    if student is None or student.learning_state is None:
        return None

    state = student.learning_state
    topic_slug = assessment.topic_slug
    questions = get_questions_by_ids(db, assessment.question_ids)
    question_by_id = {question.id: question for question in questions}
    submitted_by_id = {answer.question_id: answer for answer in payload.answers}

    concept_scores = dict(state.concept_scores or {})
    mastery_before = float(concept_scores.get(topic_slug, state.mastery or 0.0))
    current_mastery = mastery_before
    results = []
    correct_count = 0

    for question in questions:
        submitted = submitted_by_id.get(question.id)
        raw_answer = submitted.answer if submitted else ""
        hint_used = submitted.hint_used if submitted else False
        time_seconds = submitted.time_seconds if submitted else None
        correct = _grade_answer(question, raw_answer)
        if correct:
            correct_count += 1

        misconception_tag = None if correct else _misconception_for_answer(question, raw_answer)
        repeated = _is_repeated_misconception(state.mistakes or [], misconception_tag)
        mastery_event = _mastery_event(correct, hint_used, repeated)
        mastery_after = apply_mastery_event(current_mastery, mastery_event)

        if misconception_tag:
            state.mistakes, _ = add_misconception(state.mistakes or [], misconception_tag)

        state.confidence = _updated_confidence(state.confidence, correct, hint_used)
        if correct and question.difficulty == 3:
            state.adaptability = adjust_adaptability_for_transfer(state.adaptability, succeeded=True)

        concept_scores[topic_slug] = mastery_after
        state.concept_scores = concept_scores
        state.mastery = mastery_after
        db.add(state)
        db.commit()
        db.refresh(state)

        create_answer(
            db,
            assessment_id=assessment.id,
            question_id=question.id,
            answer=raw_answer,
            hint_used=hint_used,
            time_seconds=time_seconds,
            correct=correct,
            misconception_tag=misconception_tag,
        )
        create_learning_event(
            db,
            student_id=student.id,
            session_id=None,
            concept=topic_slug,
            answer_quality="correct" if correct else "incorrect",
            mastery_before=current_mastery,
            mastery_after=mastery_after,
        )
        results.append(
            QuestionResultRead(
                question_id=question.id,
                correct=correct,
                explanation=question.explanation,
                misconception_tag=misconception_tag,
                note="This is a common mix-up to review." if misconception_tag else None,
            )
        )
        current_mastery = mastery_after

    mark_assessment_submitted(db, assessment)
    total = len(questions)
    return AssessmentSubmitResponse(
        assessment_id=assessment.id,
        results=results,
        score_summary=ScoreSummaryRead(
            correct=correct_count,
            total=total,
            percent=round(correct_count / total, 4) if total else 0.0,
        ),
        mastery_before=mastery_before,
        mastery_after=current_mastery,
        mastery_band=mastery_band_label(current_mastery),
        next_activity=recommend_next_activity(
            {
                "topic": topic_slug,
                "mastery": current_mastery,
                "concept_scores": state.concept_scores,
                "mistakes": state.mistakes,
            }
        ),
    )


def _select_questions(questions, learning_state, topic_slug: str, count: int):
    score = float((learning_state.concept_scores or {}).get(topic_slug, learning_state.mastery or 0.0))
    target_difficulty = 1 if score <= 0.50 else 3 if score >= 0.71 else 2
    mistakes = {mistake.casefold() for mistake in (learning_state.mistakes or [])}

    def priority(question):
        tags = {tag.casefold() for tag in (question.misconception_tags or {}).values()}
        mistake_match = bool(tags & mistakes)
        weak_topic = score <= 0.50
        return (
            0 if mistake_match else 1,
            0 if weak_topic else 1,
            abs(question.difficulty - target_difficulty),
            question.difficulty,
            question.id,
        )

    return sorted(questions, key=priority)[:count]


def _question_to_safe_response(question) -> AssessmentQuestionRead:
    return AssessmentQuestionRead(
        id=question.id,
        type=question.question_type,
        topic_slug=question.topic_slug,
        concept_slug=question.concept_slug,
        difficulty=question.difficulty,
        prompt=question.prompt,
        options=question.options or [],
        hint_available=bool(question.hint),
    )


def _grade_answer(question, answer: str) -> bool:
    if question.question_type in {"mcq", "true_false", "fill_blank"}:
        return _normalize(answer) == _normalize(question.correct_answer)
    if question.question_type == "numerical":
        return _grade_numerical(question, answer)
    if question.question_type == "short_answer":
        return _grade_short_answer(question, answer)
    return False


def _grade_numerical(question, answer: str) -> bool:
    try:
        return abs(float(answer) - float(question.correct_answer)) <= question.numerical_tolerance
    except ValueError:
        return False


def _grade_short_answer(question, answer: str) -> bool:
    settings = get_settings()
    if settings.atlas_llm_mode.lower() == "foundry":
        model_result = grade_short_answer_with_model(
            student_answer=answer,
            correct_answer=question.correct_answer,
            keywords=question.keywords or [],
        )
        if model_result is not None:
            return model_result
    normalized_answer = _normalize(answer)
    return all(_normalize(keyword) in normalized_answer for keyword in (question.keywords or []))


def _misconception_for_answer(question, answer: str) -> str | None:
    tags = question.misconception_tags or {}
    return tags.get(_normalize(answer))


def _mastery_event(correct: bool, hint_used: bool, repeated_misconception: bool) -> str:
    if correct and hint_used:
        return "correct_with_hint"
    if correct:
        return "correct_independently"
    if repeated_misconception:
        return "repeated_misconception"
    return "incorrect"


def _updated_confidence(current_confidence: float, correct: bool, hint_used: bool) -> float:
    if correct and not hint_used:
        return adjust_confidence(current_confidence, "independent_success")
    if correct:
        return adjust_confidence(current_confidence, "independent_attempt")
    return adjust_confidence(current_confidence, "independent_attempt")


def _is_repeated_misconception(mistakes: list[str], misconception_tag: str | None) -> bool:
    if not misconception_tag:
        return False
    return any(mistake.casefold() == misconception_tag.casefold() for mistake in mistakes)


def _student_by_internal_id(db: Session, student_pk: int):
    from app.models.student import Student

    return db.get(Student, student_pk)


def _normalize(value: str) -> str:
    return " ".join(str(value).strip().casefold().split())


def _slugify(value: str) -> str:
    return _normalize(value).replace(" ", "-")

"""Pydantic schemas for assessments."""

from pydantic import BaseModel, Field


class AssessmentCreateRequest(BaseModel):
    student_id: str = Field(min_length=1)
    topic: str = Field(min_length=1)
    count: int = Field(default=5, ge=1, le=20)


class AssessmentQuestionRead(BaseModel):
    id: int
    type: str
    topic_slug: str
    concept_slug: str
    difficulty: int
    prompt: str
    options: list[str]
    hint_available: bool


class AssessmentCreateResponse(BaseModel):
    assessment_id: int
    student_id: str
    topic_slug: str
    questions: list[AssessmentQuestionRead]


class SubmittedAnswer(BaseModel):
    question_id: int
    answer: str
    hint_used: bool = False
    time_seconds: float | None = Field(default=None, ge=0)


class AssessmentSubmitRequest(BaseModel):
    answers: list[SubmittedAnswer]


class QuestionResultRead(BaseModel):
    question_id: int
    correct: bool
    explanation: str
    misconception_tag: str | None = None
    note: str | None = None


class ScoreSummaryRead(BaseModel):
    correct: int
    total: int
    percent: float


class AssessmentSubmitResponse(BaseModel):
    assessment_id: int
    results: list[QuestionResultRead]
    score_summary: ScoreSummaryRead
    mastery_before: float
    mastery_after: float
    mastery_band: str
    next_activity: dict[str, str]

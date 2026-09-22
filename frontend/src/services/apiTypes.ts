/**
 * API types mirroring the ATLAS backend contract (docs/API_CONTRACT.md and the
 * FastAPI schemas in backend/app/schemas/). Field names are kept verbatim so
 * the frontend stays aligned with what the backend actually returns.
 */

// ── Curriculum ────────────────────────────────────────────────────────────────
export interface SubjectRead {
  id: number;
  name: string;
  slug: string;
  description: string;
}

export interface TopicRead {
  id: number;
  subject_id: number;
  title: string;
  slug: string;
  summary: string;
}

// ── Health ───────────────────────────────────────────────────────────────────
export interface HealthResponse {
  status: string;
  llm_mode: string;
}

// ── Student / profile ─────────────────────────────────────────────────────────
export interface CurrentLearning {
  subject: string | null;
  topic: string | null;
}

export interface LearningStateRead {
  mastery: number;
  confidence: number;
  adaptability: number;
  pace: string;
  concept_scores: Record<string, number>;
  mistakes: string[];
}

export interface StudentRead {
  student_id: string;
  name: string | null;
  grade: number | null;
  language: string;
  explanation_style: string;
  preferences: Record<string, unknown>;
  current_learning: CurrentLearning;
  learning_state: LearningStateRead;
}

export interface SessionRead {
  id: number;
  subject: string;
  topic: string;
  started_at: string;
}

export interface MessageRead {
  id: number;
  session_id: number;
  role: string;
  content: string;
  created_at: string;
}

// ── Gamification (shared by chat / focus / flashcards / assessments) ──────────
export interface GamificationAward {
  xp_awarded: number;
  new_total: number;
  level_up: boolean;
  badges_unlocked: string[];
  reason: string | null;
}

export interface StreakRead {
  current: number;
  longest: number;
}

export interface BadgeRead {
  id: string;
  name: string;
  unlocked_at: string;
}

export interface DailyGoalRead {
  targets: Record<string, number>;
  progress: Record<string, number>;
  completed: boolean;
}

export interface XPEventRead {
  action: string;
  xp: number;
  topic: string | null;
  created_at: string;
}

export interface GamificationProfileRead {
  xp: number;
  level: number;
  xp_to_next_level: number;
  streak: StreakRead;
  badges: BadgeRead[];
  daily_goal: DailyGoalRead;
  recent_xp: XPEventRead[];
}

export interface AchievementStateRead {
  id: string;
  name: string;
  criteria: string;
  unlocked: boolean;
  unlocked_at: string | null;
}

// ── Chat ───────────────────────────────────────────────────────────────────────
export interface ChatRequest {
  student_id: string;
  message: string;
  subject: string;
  topic: string;
}

export interface ChatResponse {
  session_id: number;
  reply: string;
  student_state: { mastery: number; confidence: number };
  gamification: GamificationAward | null;
}

// ── Progress ───────────────────────────────────────────────────────────────────
export interface LearningEventRead {
  id: number;
  session_id: number;
  concept: string;
  answer_quality: string;
  mastery_before: number;
  mastery_after: number;
  timestamp: string;
}

export interface ProgressRead {
  student_id: string;
  mastery: number;
  mastery_band: string;
  confidence: number;
  adaptability: number;
  pace: string;
  concept_scores: Record<string, number>;
  recent_learning_events: LearningEventRead[];
}

export interface NextActivityRead {
  activity: string;
  topic: string;
  reason: string;
}

// ── Focus sessions (single + pomodoro) ─────────────────────────────────────────
export interface FocusPhaseRead {
  phase: string;
  start_minute: number;
  end_minute: number;
  suggested_activity: string;
}

export interface FocusStartRequest {
  student_id: string;
  topic?: string | null;
  mode?: 'single' | 'pomodoro';
  duration_minutes?: number | null;
  preset?: string | null;
  study_minutes?: number | null;
  break_minutes?: number | null;
  rounds?: number | null;
}

export interface FocusStartResponse {
  session_id: number;
  topic: string | null;
  mode: string;
  planned_minutes: number;
  study_minutes: number | null;
  break_minutes: number | null;
  rounds: number | null;
  started_at: string;
  plan: FocusPhaseRead[];
  remaining_seconds: number;
  status: string;
  message: string | null;
}

export interface FocusInterruptResponse {
  session_id: number;
  message: string;
  remaining_seconds: number;
  status: string;
}

export interface FocusResumeResponse {
  session_id: number;
  message: string;
  remaining_seconds: number;
  status: string;
}

export interface FocusBreakResponse {
  session_id: number;
  status: string;
  message: string;
  remaining_seconds: number;
  segment_remaining_seconds: number;
  current_round: number;
}

export interface FocusCompleteRequest {
  questions_attempted?: number | null;
  concepts_studied?: string[] | null;
}

export interface FocusCompleteResponse {
  session_id: number;
  status: string;
  active_seconds: number;
  planned_minutes: number;
  message: string;
  gamification: GamificationAward | null;
}

export interface FocusSessionRead {
  session_id: number;
  student_id: string;
  topic: string | null;
  mode: string;
  planned_minutes: number;
  study_minutes: number | null;
  break_minutes: number | null;
  rounds: number | null;
  status: string;
  started_at: string;
  ended_at: string | null;
  elapsed_seconds: number;
  remaining_seconds: number;
  active_seconds: number;
  break_seconds: number;
  interruption_count: number;
  current_round: number;
  questions_attempted: number | null;
  concepts_studied: string[];
  plan: FocusPhaseRead[];
  current_phase: FocusPhaseRead | null;
  segment: 'study' | 'break' | null;
  segment_remaining_seconds: number | null;
  message: string | null;
}

// ── Focus analytics ─────────────────────────────────────────────────────────────
export interface FocusTopicStatsRead {
  topic: string;
  active_minutes: number;
}

export interface FocusRecentSessionRead {
  id: number;
  topic: string | null;
  mode: string;
  planned_minutes: number;
  active_seconds: number;
  interruption_count: number;
  status: string;
  started_at: string;
}

export interface FocusAnalyticsRead {
  student_id: string;
  total_sessions: number;
  completed_count: number;
  abandoned_count: number;
  total_active_minutes: number;
  avg_planned_minutes: number;
  avg_active_minutes: number;
  avg_interruptions_per_session: number;
  topics_studied: FocusTopicStatsRead[];
  recent_sessions: FocusRecentSessionRead[];
}

// ── Flashcards ───────────────────────────────────────────────────────────────────
export interface FlashcardRead {
  id: number;
  topic_slug: string;
  concept_slug: string;
  front: string;
  back: string;
  due: boolean;
  next_review_at: string | null;
  last_rating: string | null;
  reason: string;
}

export interface FlashcardDeckRead {
  student_id: string;
  topic_slug: string;
  size: number;
  cards: FlashcardRead[];
}

export type FlashcardRating = 'didnt_know' | 'almost' | 'knew_it' | 'easy';

export interface FlashcardReviewResponse {
  flashcard_id: number;
  topic_slug: string;
  rating: string;
  next_review_at: string;
  mastery_before: number;
  mastery_after: number;
  mastery_band: string;
  misconception_tag: string | null;
  note: string | null;
  gamification: GamificationAward | null;
}

// ── Assessments / quizzes ───────────────────────────────────────────────────────
export interface AssessmentQuestionRead {
  id: number;
  type: string;
  topic_slug: string;
  concept_slug: string;
  difficulty: number;
  prompt: string;
  options: string[];
  hint_available: boolean;
}

export interface AssessmentCreateResponse {
  assessment_id: number;
  student_id: string;
  topic_slug: string;
  questions: AssessmentQuestionRead[];
}

export interface SubmittedAnswer {
  question_id: number;
  answer: string;
  hint_used?: boolean;
  time_seconds?: number | null;
}

export interface QuestionResultRead {
  question_id: number;
  correct: boolean;
  explanation: string;
  misconception_tag: string | null;
  note: string | null;
}

export interface ScoreSummaryRead {
  correct: number;
  total: number;
  percent: number;
}

export interface AssessmentSubmitResponse {
  assessment_id: number;
  results: QuestionResultRead[];
  score_summary: ScoreSummaryRead;
  mastery_before: number;
  mastery_after: number;
  mastery_band: string;
  next_activity: Record<string, string>;
  gamification: GamificationAward | null;
}
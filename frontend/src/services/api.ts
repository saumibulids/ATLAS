/**
 * Single API client for the ATLAS backend.
 *
 * The base URL comes from VITE_API_BASE_URL (Vite env var, safe for the
 * browser) and defaults to the local backend dev server. No credentials or
 * secrets are ever referenced here — the backend owns Azure/Foundry/DB auth.
 */
import type {
  AchievementStateRead,
  AssessmentCreateResponse,
  AssessmentSubmitResponse,
  ChatRequest,
  ChatResponse,
  FlashcardDeckRead,
  FlashcardRating,
  FlashcardReviewResponse,
  FocusAnalyticsRead,
  FocusBreakResponse,
  FocusCompleteRequest,
  FocusCompleteResponse,
  FocusInterruptResponse,
  FocusResumeResponse,
  FocusSessionRead,
  FocusStartRequest,
  FocusStartResponse,
  GamificationAward,
  GamificationProfileRead,
  HealthResponse,
  NextActivityRead,
  ProgressRead,
  StudentRead,
  SubmittedAnswer,
} from './apiTypes';

/** Backend base URL. Trim any trailing slashes so path joins stay clean. */
export const API_BASE_URL: string = (
  import.meta.env.VITE_API_BASE_URL as string | undefined
)?.replace(/\/+$/, '') || 'http://localhost:8000';

/**
 * Demo student the local backend is seeded with (backend/scripts/seed_db.py).
 * Override via VITE_STUDENT_ID for a different deployment.
 */
export const STUDENT_ID: string =
  (import.meta.env.VITE_STUDENT_ID as string | undefined) || 'S001';

/** Backend subject/topic defaults matching the seeded curriculum. */
export const DEFAULT_SUBJECT = 'Computer Networks';
export const DEFAULT_TOPIC = 'routing';

/** UI-level connectivity state derived from backend health checks. */
export type BackendConnection = 'checking' | 'online' | 'offline';

export class ApiError extends Error {
  /** HTTP status code; 0 means the backend could not be reached at all. */
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
    });
  } catch {
    throw new ApiError(
      `Could not reach the ATLAS backend at ${API_BASE_URL}. Make sure it is running (uvicorn app.main:app --reload).`,
      0,
    );
  }

  if (!res.ok) {
    let detail: unknown = res.statusText;
    try {
      const body = await res.json();
      detail = (body as { detail?: unknown })?.detail ?? detail;
    } catch {
      // Non-JSON error body — keep the status text.
    }
    const message =
      typeof detail === 'string'
        ? detail
        : Array.isArray(detail) && typeof detail[0] === 'object' && detail[0] !== null
          ? JSON.stringify(detail)
          : `Request failed with status ${res.status}`;
    throw new ApiError(message, res.status);
  }

  return (await res.json()) as T;
}

const encode = (value: string | number): string => encodeURIComponent(String(value));

// ── Health ─────────────────────────────────────────────────────────────────────
export const getHealth = (): Promise<HealthResponse> => request<HealthResponse>('/health');

// ── Student / profile ────────────────────────────────────────────────────────────
export const getStudent = (studentId: string = STUDENT_ID): Promise<StudentRead> =>
  request<StudentRead>(`/api/students/${encode(studentId)}`);

export const getStudentSessions = (
  studentId: string = STUDENT_ID,
): Promise<import('./apiTypes').SessionRead[]> =>
  request<import('./apiTypes').SessionRead[]>(`/api/students/${encode(studentId)}/sessions`);

// ── Chat (ATLAS tutor) ───────────────────────────────────────────────────────────
export const postChat = (payload: ChatRequest): Promise<ChatResponse> =>
  request<ChatResponse>('/api/chat', { method: 'POST', body: JSON.stringify(payload) });

export const getSessionMessages = (
  sessionId: number,
): Promise<import('./apiTypes').MessageRead[]> =>
  request<import('./apiTypes').MessageRead[]>(`/api/sessions/${sessionId}/messages`);

// ── Progress ─────────────────────────────────────────────────────────────────────
export const getStudentProgress = (studentId: string = STUDENT_ID): Promise<ProgressRead> =>
  request<ProgressRead>(`/api/students/${encode(studentId)}/progress`);

export const getStudentNextActivity = (
  studentId: string = STUDENT_ID,
): Promise<NextActivityRead> =>
  request<NextActivityRead>(`/api/students/${encode(studentId)}/next-activity`);

// ── Gamification ─────────────────────────────────────────────────────────────────
export const getGamification = (
  studentId: string = STUDENT_ID,
): Promise<GamificationProfileRead> =>
  request<GamificationProfileRead>(`/api/students/${encode(studentId)}/gamification`);

export const getAchievements = (
  studentId: string = STUDENT_ID,
): Promise<AchievementStateRead[]> =>
  request<AchievementStateRead[]>(`/api/students/${encode(studentId)}/achievements`);

export const recordActivity = (
  type: string,
  topic: string | null = null,
  studentId: string = STUDENT_ID,
): Promise<GamificationAward> =>
  request<GamificationAward>(`/api/students/${encode(studentId)}/activity`, {
    method: 'POST',
    body: JSON.stringify({ type, topic }),
  });

// ── Focus sessions (single + pomodoro) ────────────────────────────────────────────
export const startFocus = (payload: FocusStartRequest): Promise<FocusStartResponse> =>
  request<FocusStartResponse>('/api/focus/start', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const getFocusSession = (sessionId: number): Promise<FocusSessionRead> =>
  request<FocusSessionRead>(`/api/focus/${sessionId}`);

export const interruptFocus = (sessionId: number): Promise<FocusInterruptResponse> =>
  request<FocusInterruptResponse>(`/api/focus/${sessionId}/interrupt`, { method: 'POST' });

export const resumeFocus = (sessionId: number): Promise<FocusResumeResponse> =>
  request<FocusResumeResponse>(`/api/focus/${sessionId}/resume`, { method: 'POST' });

export const startFocusBreak = (sessionId: number): Promise<FocusBreakResponse> =>
  request<FocusBreakResponse>(`/api/focus/${sessionId}/break/start`, { method: 'POST' });

export const endFocusBreak = (sessionId: number): Promise<FocusBreakResponse> =>
  request<FocusBreakResponse>(`/api/focus/${sessionId}/break/end`, { method: 'POST' });

export const completeFocus = (
  sessionId: number,
  payload: FocusCompleteRequest = {},
): Promise<FocusCompleteResponse> =>
  request<FocusCompleteResponse>(`/api/focus/${sessionId}/complete`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const getFocusAnalytics = (
  studentId: string = STUDENT_ID,
): Promise<FocusAnalyticsRead> =>
  request<FocusAnalyticsRead>(`/api/students/${encode(studentId)}/focus/analytics`);

// ── Flashcards ────────────────────────────────────────────────────────────────────
export const getFlashcards = (
  topic: string = DEFAULT_TOPIC,
  size: number = 8,
  studentId: string = STUDENT_ID,
): Promise<FlashcardDeckRead> => {
  const query = new URLSearchParams({ topic, size: String(size) });
  return request<FlashcardDeckRead>(
    `/api/students/${encode(studentId)}/flashcards?${query.toString()}`,
  );
};

export const reviewFlashcard = (
  flashcardId: number,
  rating: FlashcardRating,
  studentId: string = STUDENT_ID,
): Promise<FlashcardReviewResponse> =>
  request<FlashcardReviewResponse>(`/api/flashcards/${flashcardId}/review`, {
    method: 'POST',
    body: JSON.stringify({ student_id: studentId, rating }),
  });

// ── Assessments / quizzes ─────────────────────────────────────────────────────────
export const createAssessment = (
  topic: string = DEFAULT_TOPIC,
  count: number = 5,
  studentId: string = STUDENT_ID,
): Promise<AssessmentCreateResponse> =>
  request<AssessmentCreateResponse>('/api/assessments', {
    method: 'POST',
    body: JSON.stringify({ student_id: studentId, topic, count }),
  });

export const submitAssessment = (
  assessmentId: number,
  answers: SubmittedAnswer[],
): Promise<AssessmentSubmitResponse> =>
  request<AssessmentSubmitResponse>(`/api/assessments/${assessmentId}/submit`, {
    method: 'POST',
    body: JSON.stringify({ answers }),
  });

// ── Curriculum ─────────────────────────────────────────────────────────────────────
export const getSubjects = (): Promise<import('./apiTypes').SubjectRead[]> =>
  request<import('./apiTypes').SubjectRead[]>('/api/subjects');

export const getSubjectTopics = (
  subjectId: number,
): Promise<import('./apiTypes').TopicRead[]> =>
  request<import('./apiTypes').TopicRead[]>(`/api/subjects/${subjectId}/topics`);
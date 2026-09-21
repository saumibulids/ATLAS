# ATLAS Backend — Progress & Audit Report

Audit date: 2026-09-21. Based on source read (no code changes) and running the test suite on Python 3.13.5 / SQLAlchemy 2.0.39 / Pydantic 2.10.3 / FastAPI 0.135.2.

> **Updated 2026-09-21 (after the fix):** Known issue #1 is resolved — `DailyGoal.date` in `app/models/gamification.py` no longer shadows the `date` type (import is now `datetime as dt`; annotation is `Mapped[dt.date]`, column name unchanged). The full suite now collects and runs: **59 passed** from `backend/`, and `seed_db.py` succeeds after dropping `atlas.db`. The audit text below otherwise reflects the pre-fix read (notably items 1–2 under [Known issues](#known-issues)).

## Done

- **Phase 1** — FastAPI app (`app/main.py`), config via pydantic-settings (`app/core/config.py`), `GET /health` reporting `llm_mode`, SQLite via SQLAlchemy 2.0 (`app/database/database.py`), and `app/agents/foundry_agent.py` with `ATLAS_LLM_MODE=mock|foundry` (mock is default). `backend/.env.example` present.
- **Phase 2** — Student profile create/read/patch (incl. `current_learning` subject/topic, preferences, explanation style), sessions + messages persistence with session reuse and `SESSION_TIMEOUT_MINUTES`, `POST /api/chat` with history + tutor context injection (`app/services/tutor_service.py`), `GET /api/sessions/{id}/messages`.
- **Phase 3** — Pure-function engine in `app/engine/` (`mastery`, `confidence`, `adaptability`, `misconceptions`, `next_activity`); turn analysis (`analyze_turn` + mock model in `foundry_agent.py`); `learning_events` audit table; `GET /api/students/{id}/progress` and `/next-activity`.
- **Phase 4** — Curriculum (subjects/topics/concepts seeded from `content/curriculum/computer_networks/`); cascading notes with adaptive variants (simple / standard / advanced chosen from concept score or mastery); assessments with a question bank (mcq, true_false, fill_blank, numerical, short_answer), backend grading, 409 on double submit; flashcards with personalized decks (due → previous mistake → weak topic → general revision) and spaced review intervals; feedback loop into learning state.
- **Phase 5** — Gamification (`app/services/gamification_service.py`): XP, levels (`GAMIFICATION_LEVEL_THRESHOLDS`), streaks (Asia/Kolkata timezone), badges (incl. per-topic `topic_explorer:*`), daily goals, anti-farming daily XP caps; `POST /api/students/{id}/activity`, `GET .../gamification`, `GET .../achievements`; `award_focus_session` hook reserved for Phase 6.
- **Phase 6a** — Single focus sessions (`app/services/focus_service.py`): backend-owned time (injectable clock), mastery-adaptive session plans built from the spec §20 phase split (phases always sum exactly to the duration), tab-hidden/visible interruption records with `seconds_away`, pause-while-away timer semantics, 80% completion threshold vs neutral "abandoned", 10-minute auto-abandon grace, one active session per student (409), `award_focus_session` invoked exactly once on completion. Routes: `POST /api/focus/start`, `GET /api/focus/{id}`, `POST /api/focus/{id}/interrupt|resume|complete`.
- **Phase 6b** — Pomodoro mode + focus analytics (§22–23; committed as **phase 6b**). Pomodoro start with presets (`25/5`, `45/10` in `core/constants.py`) or custom study 5–90 / break 1–30 / rounds 1–8; full cycle schedule (study, break, …, study, no trailing break) with the backend computing `current_round`, studying-vs-on-break, remaining for the current segment and the whole session from the server clock; `POST /api/focus/{id}/break/start|end` with break time into `break_seconds` (excluded from active time) and 400/409 transition validation; completion when active study time reaches 80% of planned study time, XP awarded once; auto-abandon over the whole planned session including breaks. Analytics `GET /api/students/{id}/focus/analytics`: totals, completed/abandoned counts, total/avg active minutes, avg planned vs actual, avg interruptions per session, per-topic minutes, recent sessions — durations and counts only, zeros for a student with no history. New model column `segment_started_at` (+ docs).
- **Conventions honored in code** — `concept_scores` keyed by topic slug; routes are thin (no logic); services orchestrate; `engine/` is pure functions with no DB/Azure imports; only `agents/foundry_agent.py` imports Azure; code describes observable learning behavior only (never diagnoses).

## Partial

- **AI Tutor (§6)** — mock mode fully works; the Foundry path (`ask_atlas`, `analyze_turn`, `grade_short_answer_with_model`) is written but has **not** been verified against real Azure. Knowledge-base / AI Search wiring is absent.
- **Practice engine (§15)** — serves pre-seeded questions and grades 5 answer types in the backend; no AI question generation, no coding question type.
- **Gamification (§18)** — XP/levels/streaks/badges/daily-goals/achievements done; "Topic completion / Challenges / Milestones" not present.
- **Focus mode (§19–23)** — Phase 6a + 6b done: single sessions and Pomodoro (study/break rounds, `on_break` status, break timers excluded from active time), completion/abandonment, expiry, XP award, and focus analytics (§23) over recorded durations/counts. The Pomodoro plan is the cycle schedule (study/break segments); the finer §20 sub-phases inside each study round are not built.
- **Knowledge grounding (§31)** — curriculum lives in local JSON only; no Azure AI Search / Foundry KB ingestion (KB index is not referenced anywhere in code).
- **Multilingual (§32)** — student `language` is stored and injected into the tutor prompt; no translation tier or per-language content.
- **Topic drift (§38)** — per-session subject/topic context is maintained; no explicit connect→answer→return or "switch topics?" confirmation logic.
- **Reliability (§37)** — grounding/citation guidance exists only at prompt level; no citation pipeline in code.
- **Architecture (§24 / §44)** — structure matches (api/routes, services, agents, engine, database/repositories, core), but several files are Phase-stub placeholders (see Not built); DB is SQLite, PostgreSQL not used.
- **Database (§25)** — all working tables created, but `mistakes` is a JSON column on `learning_states` instead of a dedicated table, and `focus_sessions` / `feedback` tables do not exist.
- **Assessment submit response** — returns an extra `gamification` block not documented in `docs/API_CONTRACT.md` (contract is stale rather than code wrong).
- **Mastery bands (§10)** — labels matching the spec are in `core/constants.py` (code-level config, not runtime-configurable).

## Not built

- **Phase 7 (§33-35):** Voice (Azure Speech STT/TTS); student feedback endpoints (`feedback.py` stub, `feedback.py` model stub); parent feedback / parent dashboard API (`parent.py` stub); distinguishing student vs parent vs system feedback.
- **Phase 8:** real Foundry verification, finalized API contract, deployment (PostgreSQL, hosting).
- **Auth/security:** `app/core/security.py` is a stub (no authentication or authorization).
- **Curriculum ingestion:** `scripts/ingest_curriculum.py` is a stub (curriculum is loaded by seed scripts instead).
- **Language/LLM modes other than mock:** only `mock` ever runs in practice.

## Routes

Registered endpoints (from `app/main.py` + route files):

| Method | Path | File |
|---|---|---|
| GET | `/health` | `app/main.py` |
| POST | `/api/students` | `api/routes/students.py` |
| GET | `/api/students/{student_id}` | `api/routes/students.py` |
| PATCH | `/api/students/{student_id}` | `api/routes/students.py` |
| GET | `/api/students/{student_id}/sessions` | `api/routes/students.py` |
| GET | `/api/students/{student_id}/progress` | `api/routes/students.py` |
| GET | `/api/students/{student_id}/next-activity` | `api/routes/students.py` |
| POST | `/api/students/{student_id}/activity` | `api/routes/students.py` |
| GET | `/api/students/{student_id}/gamification` | `api/routes/gamification.py` |
| GET | `/api/students/{student_id}/achievements` | `api/routes/gamification.py` |
| POST | `/api/chat` | `api/routes/chat.py` |
| GET | `/api/sessions/{session_id}/messages` | `api/routes/chat.py` |
| GET | `/api/subjects` | `api/routes/topics.py` |
| GET | `/api/subjects/{subject_id}/topics` | `api/routes/topics.py` |
| GET | `/api/topics/{topic_id}/notes` | `api/routes/topics.py` |
| POST | `/api/assessments` | `api/routes/assessments.py` |
| POST | `/api/assessments/{assessment_id}/submit` | `api/routes/assessments.py` |
| GET | `/api/students/{student_id}/flashcards` | `api/routes/flashcards.py` |
| POST | `/api/flashcards/{flashcard_id}/review` | `api/routes/flashcards.py` |
| POST | `/api/focus/start` | `api/routes/focus.py` |
| GET | `/api/focus/{session_id}` | `api/routes/focus.py` |
| POST | `/api/focus/{session_id}/interrupt` | `api/routes/focus.py` |
| POST | `/api/focus/{session_id}/resume` | `api/routes/focus.py` |
| POST | `/api/focus/{session_id}/break/start` | `api/routes/focus.py` |
| POST | `/api/focus/{session_id}/break/end` | `api/routes/focus.py` |
| POST | `/api/focus/{session_id}/complete` | `api/routes/focus.py` |
| GET | `/api/students/{student_id}/focus/analytics` | `api/routes/focus.py` |

`app/api/routes/progress.py`, `feedback.py`, `parent.py` are one-line phase stubs and are **not** registered in `main.py`. (`focus.py` is now implemented.)

### API_CONTRACT.md coverage

`docs/API_CONTRACT.md` documents **18** of the 27 endpoints: subjects, subject topics, topic notes, create assessment, submit assessment, flashcards deck, flashcard review, record activity, gamification profile, achievements, start focus, get focus state, interrupt, resume, break start, break end, complete, focus analytics.

Missed from the contract — **9 existing endpoints not documented:**
1. `GET /health`
2. `POST /api/chat`
3. `GET /api/sessions/{session_id}/messages`
4. `POST /api/students` (create)
5. `GET /api/students/{student_id}`
6. `PATCH /api/students/{student_id}`
7. `GET /api/students/{student_id}/sessions`
8. `GET /api/students/{student_id}/progress`
9. `GET /api/students/{student_id}/next-activity`

Also stale in the contract: assessment submit response omits the `gamification` field the code returns; the flashcard-review response block sits (misplaced) under the Achievements section.

## Tables

SQLAlchemy models (`app/database/database.py:import_models`):

| Table | Model file | Notes |
|---|---|---|
| `students` | `models/student.py` | + `explanation_style`, `preferences` added by `_ensure_phase2_columns` on SQLite |
| `learning_states` | `models/learning_state.py` | one-to-one student; `concept_scores` JSON keyed by topic slug; `mistakes` JSON |
| `sessions` / `messages` | `models/session.py` | chat storage |
| `subjects` / `topics` / `concepts` | `models/curriculum.py` | `topics.notes` JSON holds cascading-note levels |
| `assessments` / `questions` / `answers` | `models/assessment.py` | question bank; answers with hint/time/correct/misconception |
| `flashcards` / `flashcard_reviews` | `models/flashcard.py` | spaced repetition schedule |
| `student_xp` / `achievements` / `streaks` / `daily_goals` | `models/gamification.py` | gamification |
| `focus_sessions` / `focus_interruptions` | `models/focus_session.py` | Phase 6 focus sessions (single + Pomodoro); `segment_started_at` column added in Phase 6b |
| `learning_events` | `models/learning_event.py` | Phase 3B audit trail (extra vs spec §25) |

Spec §25 tables **not** present: `mistakes` (folded into `learning_states.mistakes`), `feedback` (stub).

Seed scripts (`backend/scripts/`):
- `seed_db.py` — init + demo student + curriculum + questions + flashcards (the "reset" entry point).
- `seed_curriculum.py` — subjects/topics/concepts from `content/curriculum/computer_networks/*.json`.
- `seed_questions.py` — question bank from `content/curriculum/computer_networks/questions/`.
- `seed_flashcards.py` — flashcards from `content/curriculum/computer_networks/flashcards/`.
- `ingest_curriculum.py` — stub.

Content: Computer Networks only (arp, ipv4_addressing, routing, switching).

## How to run / test / reset

- Tests: `python -m pytest` from `backend/` — **83 passed** after Phase 6b (24 focus tests: 13 session + 11 Pomodoro/analytics) (deprecation warnings only, no failures).
- Run the server: `uvicorn app.main:app --reload` from `backend/`, using `backend/.env.example` → `.env` (`ATLAS_LLM_MODE=mock` is the default; `foundry` requires `AZURE_AI_PROJECT_ENDPOINT`).
- Reset dev DB: delete `backend/atlas.db`, then `python scripts/seed_db.py`.
- Never read, print, or commit `backend/.env`.

## Conventions

- Source of truth: `docs/ATLAS_SPEC.md` (read before any task) + `AGENTS.md`.
- Layering: routes → services → engine/repositories. Routes contain no logic. `engine/` is pure functions (no DB, no Azure). Only `agents/foundry_agent.py` talks to Azure/Foundry.
- Backend owns all learning logic (mastery, XP, next topic); the frontend only displays.
- `concept_scores` keyed by topic slug; mastery/confidence/adaptability in 0.0–1.0.
- Never diagnose students — only describe observable learning behavior.
- No hardcoded secrets; config via `.env` + `core/config.py`; never commit `.env`.
- Stack: Python 3.11+ (running 3.13.5), FastAPI, SQLAlchemy 2.0, Pydantic v2, SQLite (dev), pytest.

## Known issues

1. **RESOLVED — `DailyGoal.date` shadowed the `date` type (commit `6ab58c6`).** `class DailyGoal` in `app/models/gamification.py` failed to map on SQLAlchemy 2.0.39: `TypeError: Boolean value of this clause is not defined`. The column `date: Mapped[date]` shadowed the imported `date` type, so SQLAlchemy resolved the annotation to the column clause itself. Fixed with `import datetime as dt` and `Mapped[dt.date]` (column name kept as `date` so the DB schema and callers keep working); all other bare `date`/`datetime` uses in that file updated to `dt.date`/`dt.datetime`. Grep of `app/models/` for the same pattern (attribute named `date`/`datetime`/`time`/`timedelta` annotated with a same-named type) found no other occurrences.
2. **RESOLVED — full suite now executes.** With #1 fixed, all 7 test files / 2 suites (api, engine) collect and run: **59 passed** from `backend/`. Test results in this report no longer reflect collection failure.
3. **Foundry mode is unverified and possibly invented.** `foundry_agent.py` uses `AIProjectClient.get_openai_client(agent_name=...).conversations.create()` / `responses.create(...)`. Per AGENTS.md rules this API surface must be verified against official Azure docs before trusting it; a live smoke test with `ATLAS_LLM_MODE=foundry` is still pending.
4. **Migration strategy is minimal.** Only `_ensure_phase2_columns` (SQLite, 2 columns) exists; no Alembic. The supported dev flow is "drop atlas.db + reseed".
5. **API contract drift** — 9 endpoints exist but are undocumented in `docs/API_CONTRACT.md`; assessment submit response contains an undocumented `gamification` field; flashcard-review response block is misplaced.
6. **Stub files look done but are empty** — `progress.py`, `feedback.py`, `parent.py` routes; `feedback_service.py`; `feedback.py` model; `ingest_curriculum.py`; `core/security.py`. Easy to mistake for implemented (`focus.py`, `focus_service.py`, `focus_session.py` are now implemented in Phase 6a/6b).
7. Git history shows commits through `phase 6b` for Phases 1–6 (`initial setup` → `phase 6b`), so the phases 1–6 claims in this report match the commit trail.
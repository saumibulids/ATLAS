# ATLAS API Contract

## Subjects

`GET /api/subjects`

Response:

```json
[
  {
    "id": 1,
    "name": "Computer Networks",
    "slug": "computer-networks",
    "description": "Foundational computer networking concepts."
  }
]
```

## Subject Topics

`GET /api/subjects/1/topics`

Response:

```json
[
  {
    "id": 1,
    "subject_id": 1,
    "title": "Routing",
    "slug": "routing",
    "summary": "Routing explains how packets move between different networks."
  }
]
```

## Topic Notes

`GET /api/topics/1/notes?student_id=S001`

Response:

```json
{
  "topic_id": 1,
  "topic": "Routing",
  "variant": "standard",
  "levels": [
    {
      "level": "overview",
      "content": "Routing moves IP packets from one network to another until they reach the destination network.",
      "question": null,
      "answer": null,
      "misconception_flag": false
    },
    {
      "level": "quick_check",
      "content": "Check what routing decisions are based on.",
      "question": "What field does a router inspect to choose a route?",
      "answer": "The destination IP address.",
      "misconception_flag": false
    }
  ]
}
```

## Create Assessment

`POST /api/assessments`

Request:

```json
{
  "student_id": "S001",
  "topic": "routing",
  "count": 3
}
```

Response:

```json
{
  "assessment_id": 12,
  "student_id": "S001",
  "topic_slug": "routing",
  "questions": [
    {
      "id": 41,
      "type": "mcq",
      "topic_slug": "routing",
      "concept_slug": "routing-table",
      "difficulty": 1,
      "prompt": "What does a router use to choose where to send a packet next?",
      "options": ["Routing table", "MAC address table", "ARP cache", "DNS record"],
      "hint_available": true
    }
  ]
}
```

The response intentionally omits `correct_answer`, `explanation`, and `misconception_tag`.

## Submit Assessment

`POST /api/assessments/12/submit`

Request:

```json
{
  "answers": [
    {
      "question_id": 41,
      "answer": "Routing table",
      "hint_used": false,
      "time_seconds": 18
    }
  ]
}
```

Response:

```json
{
  "assessment_id": 12,
  "results": [
    {
      "question_id": 41,
      "correct": true,
      "explanation": "A router checks its routing table to choose the next hop for an IP packet.",
      "misconception_tag": null,
      "note": null
    }
  ],
  "score_summary": {
    "correct": 1,
    "total": 1,
    "percent": 1.0
  },
  "mastery_before": 0.64,
  "mastery_after": 0.74,
  "mastery_band": "Strong",
  "next_activity": {
    "activity": "challenge",
    "topic": "routing",
    "reason": "Mastery is strong, so a transfer challenge is appropriate."
  }
}
```

A second submit for the same assessment returns `409`.

## Personalized Flashcards

`GET /api/students/S001/flashcards?topic=routing&size=8`

Response:

```json
{
  "student_id": "S001",
  "topic_slug": "routing",
  "size": 8,
  "cards": [
    {
      "id": 5,
      "topic_slug": "routing",
      "concept_slug": "routing-table",
      "front": "What table does a router check to forward an IP packet?",
      "back": "The routing table.",
      "due": false,
      "next_review_at": null,
      "last_rating": null,
      "reason": "weak_topic"
    }
  ]
}
```

The deck is personalized in this order: due cards, cards linked to previous mistakes, weak-topic cards, then general topic revision.

## Submit Flashcard Review

`POST /api/flashcards/5/review`

Request:

```json
{
  "student_id": "S001",
  "rating": "knew_it"
}
```

## Record Student Activity

`POST /api/students/S001/activity`

Request:

```json
{
  "type": "notes_completed",
  "topic": "routing"
}
```

Response:

```json
{
  "xp_awarded": 20,
  "new_total": 120,
  "level_up": false,
  "badges_unlocked": [],
  "reason": null
}
```

The frontend reports the completed activity only. The backend decides XP, caps, levels, streaks, and badges.

## Gamification Profile

`GET /api/students/S001/gamification`

Response:

```json
{
  "xp": 120,
  "level": 2,
  "xp_to_next_level": 130,
  "streak": {
    "current": 3,
    "longest": 3
  },
  "badges": [
    {
      "id": "first_steps",
      "name": "First Steps",
      "unlocked_at": "2026-09-21T12:00:00"
    }
  ],
  "daily_goal": {
    "targets": {
      "notes": 20,
      "practice": 40,
      "focus": 50
    },
    "progress": {
      "notes": 20,
      "practice": 40,
      "focus": 0
    },
    "completed": false
  },
  "recent_xp": [
    {
      "action": "notes_completed",
      "xp": 20,
      "topic": "routing",
      "created_at": "2026-09-21T12:00:00"
    }
  ]
}
```

## Achievements

`GET /api/students/S001/achievements`

Response:

```json
[
  {
    "id": "first_steps",
    "name": "First Steps",
    "criteria": "Earn XP for the first time.",
    "unlocked": true,
    "unlocked_at": "2026-09-21T12:00:00"
  },
  {
    "id": "transfer_thinker",
    "name": "Transfer Thinker",
    "criteria": "Demonstrate knowledge transfer.",
    "unlocked": false,
    "unlocked_at": null
  }
]
```

Ratings are `didnt_know`, `almost`, `knew_it`, and `easy`.

Response:

```json
{
  "flashcard_id": 5,
  "topic_slug": "routing",
  "rating": "knew_it",
  "next_review_at": "2026-09-25T12:00:00",
  "mastery_before": 0.45,
  "mastery_after": 0.55,
  "mastery_band": "Understanding",
  "misconception_tag": null,
  "note": null
}
```

## Start Focus Session

`POST /api/focus/start`

Request:

```json
{
  "student_id": "S001",
  "topic": "routing",
  "mode": "single",
  "duration_minutes": 45
}
```

The backend builds the session plan by scaling the spec §20 phases (quick
revision, learn, practice, notes/revision, mini assessment, reflection) to the
chosen duration — the phases always add up to exactly `duration_minutes`. For a
low-mastery student more time goes to *learn*; for a high-mastery student more
time goes to *practice* and *mini assessment*. `suggested_activity` points at an
existing feature (`notes`, `flashcards`, or `practice`) for that topic.

Durations: `25`, `45`, `60`, or custom `5–180` minutes. `mode` is `"single"`
only in this phase (`"pomodoro"` returns `400`). One active session per student:
starting a second one returns `409`. A missing student returns `404`.

Response:

```json
{
  "session_id": 8,
  "topic": "routing",
  "mode": "single",
  "planned_minutes": 45,
  "started_at": "2026-09-21T06:00:00",
  "plan": [
    { "phase": "quick_revision", "start_minute": 0, "end_minute": 5, "suggested_activity": "flashcards" },
    { "phase": "learn", "start_minute": 5, "end_minute": 20, "suggested_activity": "notes" },
    { "phase": "practice", "start_minute": 20, "end_minute": 30, "suggested_activity": "practice" },
    { "phase": "notes_revision", "start_minute": 30, "end_minute": 38, "suggested_activity": "notes" },
    { "phase": "mini_assessment", "start_minute": 38, "end_minute": 43, "suggested_activity": "practice" },
    { "phase": "reflection", "start_minute": 43, "end_minute": 45, "suggested_activity": "notes" }
  ],
  "remaining_seconds": 2700,
  "status": "active",
  "message": "Focus session started."
}
```

## Get Focus Session State

`GET /api/focus/8`

The backend is the source of truth for time: `remaining_seconds` and
`elapsed_seconds` are computed from `started_at` and the interruption records on
every read. If the session was never completed and is read after its planned end
plus the 10-minute grace period, it is marked `abandoned` automatically.

Response:

```json
{
  "session_id": 8,
  "student_id": "S001",
  "topic": "routing",
  "mode": "single",
  "planned_minutes": 45,
  "status": "active",
  "started_at": "2026-09-21T06:00:00",
  "ended_at": null,
  "elapsed_seconds": 300,
  "remaining_seconds": 2400,
  "active_seconds": 0,
  "break_seconds": 0,
  "interruption_count": 0,
  "current_round": 1,
  "questions_attempted": null,
  "concepts_studied": [],
  "plan": [
    { "phase": "quick_revision", "start_minute": 0, "end_minute": 5, "suggested_activity": "flashcards" },
    { "phase": "learn", "start_minute": 5, "end_minute": 20, "suggested_activity": "notes" },
    { "phase": "practice", "start_minute": 20, "end_minute": 30, "suggested_activity": "practice" },
    { "phase": "notes_revision", "start_minute": 30, "end_minute": 38, "suggested_activity": "notes" },
    { "phase": "mini_assessment", "start_minute": 38, "end_minute": 43, "suggested_activity": "practice" },
    { "phase": "reflection", "start_minute": 43, "end_minute": 45, "suggested_activity": "notes" }
  ],
  "current_phase": {
    "phase": "learn",
    "start_minute": 5,
    "end_minute": 20,
    "suggested_activity": "notes"
  },
  "message": null
}
```

## Interrupt Focus Session

`POST /api/focus/8/interrupt`

Records a tab-hidden event (`interruption_count` + 1, `hidden_at`). The timer is
paused while the tab is away, so the remaining time is preserved. No request
body. Returns `409` if the session already ended.

Response:

```json
{
  "session_id": 8,
  "message": "Looks like you stepped away. Your focus session is still running. Come back when you're ready.",
  "remaining_seconds": 2100,
  "status": "active"
}
```

## Resume Focus Session

`POST /api/focus/8/resume`

Records the tab-visible event (`visible_at`, `seconds_away`). No request body.
Returns `409` if the session already ended.

Response:

```json
{
  "session_id": 8,
  "message": "Welcome back! You have 35 minutes remaining.",
  "remaining_seconds": 2100,
  "status": "active"
}
```

## Complete Focus Session

`POST /api/focus/8/complete`

Request:

```json
{
  "questions_attempted": 6,
  "concepts_studied": ["routing-table"]
}
```

Both fields are optional. The session is marked `completed` when the actual
active time (clock time minus interruption time) reaches at least **80%** of the
planned duration, otherwise `abandoned` (neutral message — this is study
support, not surveillance). A completed session calls the Phase 5 gamification
hook once. Returns `409` if the session already ended.

Response (completed):

```json
{
  "session_id": 8,
  "status": "completed",
  "active_seconds": 2400,
  "planned_minutes": 45,
  "message": "Focus session completed.",
  "gamification": {
    "xp_awarded": 50,
    "new_total": 50,
    "level_up": false,
    "badges_unlocked": ["first_steps"],
    "reason": null
  }
}
```

Response (abandoned, `gamification` is `null`):

```json
{
  "session_id": 8,
  "status": "abandoned",
  "active_seconds": 900,
  "planned_minutes": 45,
  "message": "Focus session ended before reaching the completion threshold. You can start a new session whenever you're ready.",
  "gamification": null
}
```

---

## Pomodoro Focus Sessions

Focus sessions can run in **pomodoro** mode, built from a full cycle of study /
break segments (study, break, study, break, … , study — there is **no trailing
break**). The backend computes the plan, the current round, whether the student
is studying or on break, and the remaining seconds — all from the server clock.

`POST /api/focus/start` with `"mode": "pomodoro"`. Configure it with either a
preset or an explicit study / break / rounds:

```json
{
  "student_id": "S001",
  "topic": "routing",
  "mode": "pomodoro",
  "preset": "25/5",
  "rounds": 4
}
```

or:

```json
{
  "student_id": "S001",
  "topic": "routing",
  "mode": "pomodoro",
  "study_minutes": 40,
  "break_minutes": 10,
  "rounds": 3
}
```

- Presets: `"25/5"` (25 study / 5 break) and `"45/10"`. A preset can be
  combined with `"rounds"` (defaults to 1).
- Custom ranges: `study_minutes` 5–90, `break_minutes` 1–30, `rounds` 1–8.
- `planned_minutes` is the **whole session** including breaks
  (`study × rounds + break × (rounds − 1)`). The completion threshold, however,
  is applied to the planned **study** time (`study × rounds × 0.8`).
- Returns `400` for an unknown preset, out-of-range values, or missing
  study/break config.

Response (201) — `plan` is the cycle schedule, `remaining_seconds` is the whole
planned session:

```json
{
  "session_id": 9,
  "topic": "routing",
  "mode": "pomodoro",
  "planned_minutes": 140,
  "study_minutes": 40,
  "break_minutes": 10,
  "rounds": 3,
  "started_at": "2026-09-21T06:00:00",
  "plan": [
    {"phase": "study", "start_minute": 0, "end_minute": 40, "suggested_activity": "focus"},
    {"phase": "break", "start_minute": 40, "end_minute": 50, "suggested_activity": "rest"},
    {"phase": "study", "start_minute": 50, "end_minute": 90, "suggested_activity": "focus"},
    {"phase": "break", "start_minute": 90, "end_minute": 100, "suggested_activity": "rest"},
    {"phase": "study", "start_minute": 100, "end_minute": 140, "suggested_activity": "focus"}
  ],
  "remaining_seconds": 8400,
  "status": "active",
  "message": "Focus session started."
}
```

`GET /api/focus/9` adds Pomodoro fields on top of the standard state —
`study_minutes`, `break_minutes`, `rounds`, `current_round`, `segment`
(`"study"` / `"break"`), and `segment_remaining_seconds` (time left in the
current segment). While on a break, `remaining_seconds` covers the rest of the
whole session including the break.

## Start Break

`POST /api/focus/9/break/start`

Moves a Pomodoro session from studying to `on_break` and records when the break
began (server clock). Valid only while `current_round < rounds` (a break exists
after the current study round).

- `400` — the session is `"single"` (break controls are Pomodoro-only).
- `409` — already `on_break`, or no break remaining in the cycle.
- `409` — the session already ended.

Response:

```json
{
  "session_id": 9,
  "status": "on_break",
  "message": "Break started.",
  "remaining_seconds": 6000,
  "segment_remaining_seconds": 600,
  "current_round": 1
}
```

## End Break

`POST /api/focus/9/break/end`

Finishes the break: the elapsed break time (recorded from the server clock) is
added to `break_seconds` and is **never** counted toward active study time, the
session returns to `active`, and `current_round` advances by one.

- `400` — the session is `"single"`.
- `409` — the break was never started (session is not `on_break`), or the
  session already ended.

Response:

```json
{
  "session_id": 9,
  "status": "active",
  "message": "Break over. Back to round 2.",
  "remaining_seconds": 5400,
  "segment_remaining_seconds": 2400,
  "current_round": 2
}
```

`complete` works the same as single mode. A Pomodoro session is `completed`
once its active study time reaches **80% of the planned study time**
(`study_minutes × rounds`); break time and tab-hidden time are excluded from
active time. XP is awarded exactly once. Auto-abandon uses the **whole planned
session including breaks** plus the 10-minute grace.

## Focus Analytics

`GET /api/students/S001/focus/analytics`

Durations and counts only (no psychological claims). Returns `404` if the
student does not exist; sessions run by a student with no focus history return
zeros and empty lists.

```json
{
  "student_id": "S001",
  "total_sessions": 4,
  "completed_count": 2,
  "abandoned_count": 2,
  "total_active_minutes": 120,
  "avg_planned_minutes": 40.0,
  "avg_active_minutes": 30.0,
  "avg_interruptions_per_session": 1.0,
  "topics_studied": [
    {"topic": "routing", "active_minutes": 110},
    {"topic": "ipv4_addressing", "active_minutes": 10}
  ],
  "recent_sessions": [
    {
      "id": 12,
      "topic": "routing",
      "mode": "single",
      "planned_minutes": 45,
      "active_seconds": 1800,
      "interruption_count": 0,
      "status": "abandoned",
      "started_at": "2026-09-21T12:00:00"
    }
  ]
}
```

`topics_studied` is ordered by most active minutes first; `recent_sessions` is
ordered newest first.

---

## Focus Mode frontend flow

The frontend only ever **displays** focus state — it never calculates time,
XP, or completion. Every value comes from the backend:

1. **Start** — `POST /api/focus/start` (single `duration_minutes`, or
   `pomodoro` preset/config). The response carries `remaining_seconds`, the
   `plan`, and (for Pomodoro) `study_minutes` / `break_minutes` / `rounds`.
2. **Render the countdown** — show `remaining_seconds` from
   `GET /api/focus/{id}` (refresh on any poll or on visibility change). The
   backend rebuilds elapsed/remaining from `started_at`, interruption records,
   and break records — the frontend never monitors passage of time itself.
3. **Tab hidden** — `POST /api/focus/{id}/interrupt`; the backend records the
   hidden moment and pauses the timer. **Tab visible** —
   `POST /api/focus/{id}/resume`; the response includes the fresh
   `remaining_seconds` and a welcome-back message. (Polite nudges only — never
   "you weren't paying attention".)
4. **Pomodoro breaks** — show the current segment (`segment`,
   `segment_remaining_seconds`, `current_round`) from the session state. On
   "Start break" call `POST /api/focus/{id}/break/start`; on "End break" call
   `POST /api/focus/{id}/break/end`. The backend decides legality (409 / 400)
   and records the break from its own clock.
5. **Finish** — `POST /api/focus/{id}/complete`. The backend decides
   `completed` vs `abandoned` from active time vs threshold and awards XP once;
   the response simply reports the outcome and any gamification award.

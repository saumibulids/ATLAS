# ATLAS Backend

Phase 1 FastAPI backend foundation for ATLAS.

## Run locally

```bash
pip install -r requirements.txt
python scripts/seed_db.py
uvicorn app.main:app --reload
```

Open `http://127.0.0.1:8000/docs` for Swagger.

## Mock AI mode

The default `ATLAS_LLM_MODE=mock` returns a local tutor-style response, so the backend works without Azure access.

## Foundry mode

Set `ATLAS_LLM_MODE=foundry` and provide `AZURE_AI_PROJECT_ENDPOINT` plus `AZURE_AI_AGENT_NAME`. The adapter uses the current Microsoft Foundry Python SDK pattern: `AIProjectClient(...).get_openai_client(agent_name=...)` and the OpenAI-compatible Responses API.

## Local development with the frontend

The React/Vite frontend (in `/frontend`, served by Express on port 3000) talks to this
backend over HTTP/JSON. Run both in two terminals:

**Terminal 1 — backend (`http://localhost:8000`):**

```bash
cd backend
pip install -r requirements.txt
python scripts/seed_db.py   # seeds demo student S001 + curriculum
uvicorn app.main:app --reload
```

**Terminal 2 — frontend (`http://localhost:3000`):**

```bash
cd frontend
npm install
npm run dev
```

Frontend configuration (see `frontend/.env.example`):

- `VITE_API_BASE_URL` — backend base URL, default `http://localhost:8000`. The typed
  API client in `frontend/src/services/api.ts` is the only place the frontend talks to
  the backend.
- `VITE_STUDENT_ID` — whose data to display, default `S001` (seeded by
  `scripts/seed_db.py`).

CORS defaults (`CORS_ORIGINS`) already allow `http://localhost:3000`, so no backend
change is needed for local development.

The frontend never computes mastery, XP, streaks, or focus timing — those all come
from backend endpoints (`/api/students/{id}/progress`, `/api/students/{id}/gamification`,
`/api/focus/*`, etc.).

# ATLAS Agent Rules

- Source of truth: docs/ATLAS_SPEC.md. Read it before starting any task.
- Backend only, in /backend. Do not touch /frontend.
- Stack: Python 3.11+, FastAPI, SQLAlchemy 2.0, Pydantic v2, SQLite (dev), pytest.
- Layering: routes -> services -> engine/repositories. Routes contain no logic. engine/ is pure functions with no DB and no Azure imports. Only agents/foundry_agent.py may talk to Azure/Foundry.
- The frontend never calculates mastery, XP, or next topic. The backend owns all learning logic.
- Never hardcode secrets. All config via .env and core/config.py. Never commit .env.
- Never diagnose students (ADHD, anxiety, etc.). Only describe observable learning behavior.
- Build only the phase I ask for. Do not implement later phases early.
- After each task: run the tests, and tell me what you built, how to run it, and what is left.
- If unsure about an Azure/Foundry API detail, check the official docs or leave a clear TODO. Do not invent method names.
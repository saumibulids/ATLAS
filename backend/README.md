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

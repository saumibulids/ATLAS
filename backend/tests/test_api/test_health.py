"""Tests for health endpoint."""


def test_health_returns_status_and_llm_mode(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "llm_mode": "mock"}

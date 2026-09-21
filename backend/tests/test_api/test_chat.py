"""Tests for mock chat endpoint."""


def test_chat_returns_mock_reply_and_student_state(client):
    response = client.post(
        "/api/chat",
        json={
            "student_id": "S001",
            "message": "I don't understand routing",
            "subject": "Computer Networks",
            "topic": "Routing",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert "Routing is how" in body["reply"]
    assert "question" in body["reply"].lower()
    assert body["student_state"] == {"mastery": 0.64, "confidence": 0.55}


def test_chat_returns_404_for_missing_student(client):
    response = client.post(
        "/api/chat",
        json={
            "student_id": "NOPE",
            "message": "Hello",
            "subject": "Computer Networks",
            "topic": "Routing",
        },
    )

    assert response.status_code == 404

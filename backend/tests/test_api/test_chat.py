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
    assert body["session_id"] > 0
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


def test_correct_answer_raises_mastery(client):
    response = client.post(
        "/api/chat",
        json={
            "student_id": "S001",
            "message": "A router checks the routing table to choose the next hop.",
            "subject": "Computer Networks",
            "topic": "Routing",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["student_state"]["mastery"] == 0.74

    progress = client.get("/api/students/S001/progress").json()
    assert progress["mastery_band"] == "Strong"
    assert progress["concept_scores"]["routing"] == 0.74
    assert progress["recent_learning_events"][0]["answer_quality"] == "correct"
    assert progress["recent_learning_events"][0]["mastery_before"] == 0.64
    assert progress["recent_learning_events"][0]["mastery_after"] == 0.74


def test_wrong_answer_lowers_mastery(client):
    response = client.post(
        "/api/chat",
        json={
            "student_id": "S001",
            "message": "A switch uses IP address to forward frames.",
            "subject": "Computer Networks",
            "topic": "Switching",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["student_state"]["mastery"] == 0.59


def test_repeated_misconception_lowers_mastery_more(client):
    payload = {
        "student_id": "S001",
        "message": "A switch uses IP address to forward frames.",
        "subject": "Computer Networks",
        "topic": "Switching",
    }

    first = client.post("/api/chat", json=payload).json()
    second = client.post("/api/chat", json=payload).json()

    assert first["student_state"]["mastery"] == 0.59
    assert second["student_state"]["mastery"] == 0.49

    progress = client.get("/api/students/S001/progress").json()
    assert progress["concept_scores"]["switching"] == 0.49
    assert progress["recent_learning_events"][0]["mastery_before"] == 0.59
    assert progress["recent_learning_events"][0]["mastery_after"] == 0.49
    assert progress["recent_learning_events"][0]["answer_quality"] == "incorrect"


def test_i_dont_know_lowers_confidence(client):
    response = client.post(
        "/api/chat",
        json={
            "student_id": "S001",
            "message": "I don't know.",
            "subject": "Computer Networks",
            "topic": "Routing",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["student_state"] == {"mastery": 0.64, "confidence": 0.51}


def test_analysis_failure_changes_nothing(client, monkeypatch):
    def broken_analysis(student_message, tutor_context):
        raise ValueError("bad json")

    monkeypatch.setattr("app.services.tutor_service.analyze_turn", broken_analysis)

    response = client.post(
        "/api/chat",
        json={
            "student_id": "S001",
            "message": "A router checks the routing table.",
            "subject": "Computer Networks",
            "topic": "Routing",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["student_state"] == {"mastery": 0.64, "confidence": 0.55}

    progress = client.get("/api/students/S001/progress").json()
    assert progress["concept_scores"] == {"routing": 0.64}
    assert progress["recent_learning_events"] == []

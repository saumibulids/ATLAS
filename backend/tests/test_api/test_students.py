"""Tests for student endpoint."""


def test_get_student_returns_demo_profile(client):
    response = client.get("/api/students/S001")

    assert response.status_code == 200
    body = response.json()
    assert body["student_id"] == "S001"
    assert body["language"] == "Hinglish"
    assert body["explanation_style"] == "examples"
    assert body["current_learning"]["subject"] == "Computer Networks"
    assert body["current_learning"]["topic"] == "Routing"
    assert body["learning_state"]["mastery"] == 0.64


def test_get_student_returns_404_for_missing_student(client):
    response = client.get("/api/students/NOPE")

    assert response.status_code == 404

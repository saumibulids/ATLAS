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

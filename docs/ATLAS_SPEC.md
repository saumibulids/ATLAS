# ATLAS — Complete Project Specification

## 1. Project Name

**ATLAS — Adaptive Tutor for Learning, Assessment & Support**

ATLAS is an AI-powered personalized learning platform designed to function as a safe, adaptive AI home tutor rather than a generic chatbot.

The goal is to understand how a student is learning — including their mastery, confidence, pace, misconceptions, mistakes, preferred explanation style, language, and learning history — and continuously adapt the learning experience.

ATLAS should help a student:

- Learn concepts
- Understand difficult topics
- Practice
- Revise
- Identify misconceptions
- Build mastery
- Track progress
- Stay focused
- Develop consistent study habits
- Receive personalized learning recommendations

The system should feel like a personal tutor + learning dashboard + study companion + adaptive assessment system.

---

## 2. Core Product Philosophy

ATLAS should NOT behave like:

> "Ask me anything and I will give you an answer."

Instead:

> "I understand what you're learning, where you're struggling, and how you learn. I will help you understand it and gradually become independent."

The student's goal is not simply to receive answers.

The goal is:

```
Understand → Practice → Apply → Master → Retain
```

ATLAS should encourage the student to think instead of immediately giving solutions.

---

## 3. Target Users

Primary:

- School students
- College students
- Self-learning students

Potentially:

- Teachers
- Parents

The platform should support different educational levels through configuration rather than hard-coding a single grade.

---

## 4. Main Features

ATLAS should contain the following major modules:

1. AI Tutor
2. Cascading Notes
3. Adaptive Learning
4. Practice & Quizzes
5. Flashcard-style Revision
6. Focus Mode / Pomodoro
7. Gamification
8. Student Learning Model
9. Progress Dashboard
10. Student Feedback
11. Parent Feedback
12. Learning History
13. Multilingual Support
14. Voice Support
15. Knowledge-grounded Learning
16. Safety & Guardrails

---

## 5. Main User Experience

The student enters the ATLAS application and sees a dashboard.

Example:

```
                    ATLAS
        Your Personalized Learning Companion

 ┌─────────────────────────────────────────────┐
 │ Good morning! 👋                            │
 │ Ready to continue your learning?            │
 │                                             │
 │ Current Goal                                │
 │ Computer Networks → Routing                 │
 │                                             │
 │ Progress ████████░░ 78%                     │
 │                                             │
 │ 🔥 6 day streak       ⭐ 1,240 XP           │
 └─────────────────────────────────────────────┘

 Continue Learning
 ┌─────────────────────────────────────────────┐
 │ Routing Algorithms                          │
 │ 64% mastery                                 │
 │ [ Continue ]                                │
 └─────────────────────────────────────────────┘

 Recommended
 ┌──────────────┐ ┌──────────────┐
 │ 🧠 Revise    │ │ 🎯 Focus     │
 │ Weak Topics  │ │ 25 minutes   │
 └──────────────┘ └──────────────┘
```

---

## 6. AI Tutor

The core AI tutor is ATLAS.

Technology:

- Microsoft Foundry
- Foundry Prompt Agent
- GPT-5 mini
- Foundry Knowledge / Azure AI Search
- Persistent learning memory where appropriate

Current Foundry setup:

```
Foundry Project:  Atlas-personalized-tutor
Agent:            ATLAS
Model:            GPT-5 mini
Knowledge Base:   atlas-learning-kb
Search:           atlas-tutor-search
```

The AI tutor should:

- Explain concepts
- Ask questions
- Detect observable misconceptions
- Adapt explanations
- Adjust difficulty
- Give examples
- Provide hints
- Assess understanding
- Maintain topic context
- Use curriculum-grounded knowledge
- Remember relevant learning information
- Avoid unnecessary unrelated memory

---

## 7. Tutor Interaction Logic

ATLAS should follow this interaction pattern:

New concept:

```
Explain ONE concept
        ↓
Give ONE analogy/example
        ↓
Ask ONE meaningful question
        ↓
STOP
```

Do not dump an entire chapter.

Example:

**Student:**
I don't understand switching.

**ATLAS:**
Think of a switch like a receptionist who knows which room each employee belongs to.

Then:
What information do you think the switch uses to identify the destination device?

Wait for the student's response. Then adapt.

---

## 8. Misconception Detection

ATLAS should track observable learning misconceptions, not psychological diagnoses.

Example:

**Student:**
A switch uses IP addresses to forward frames.

ATLAS detects:

```
Concept: Switching
Misconception: Confusing MAC addressing with IP addressing
```

Student model becomes:

```json
{
  "concept": "switching",
  "mastery": 0.55,
  "misconceptions": [
    "confuses MAC and IP addressing"
  ]
}
```

ATLAS should then revisit that concept later.

---

## 9. Student Learning Model

This is one of the most important components.

Each student should have a structured learning profile.

Example:

```json
{
  "student_id": "S001",
  "grade": 10,
  "language": "Hinglish",

  "current_learning": {
    "subject": "Computer Networks",
    "topic": "Routing"
  },

  "learning_state": {
    "mastery": 0.64,
    "confidence": 0.55,
    "adaptability": 0.71,
    "pace": "medium"
  },

  "concepts": {
    "switching": 0.82,
    "routing": 0.64,
    "ipv4": 0.73,
    "ipv6": 0.52
  },

  "mistakes": [
    "confuses MAC and IP addressing",
    "subnet calculation errors"
  ],

  "preferences": {
    "language": "Hinglish",
    "explanation_style": "examples"
  }
}
```

---

## 10. Mastery Score

Mastery should represent how well the student understands a concept.

Possible scoring:

```
Correct independently        +10
Correct with hint             +5
Incorrect                     -5
Repeated misconception       -10
Correct in new context       +10
```

Normalize the result to 0–100%.

Example bands:

```
0–30     Needs foundational teaching
31–50    Developing
51–70    Understanding
71–85    Strong
86–100   Mastered
```

These labels should be configurable rather than hard-coded.

---

## 11. Confidence Score

Confidence should represent observable learning behavior, not mental-health diagnosis.

Signals:

```
Independent successful answer        ↑
Independent attempt                  ↑
"I don't know"                       ↓
Repeated requests for confirmation   ↓
Giving up immediately                ↓
Successful transfer                  ↑
```

Do not claim:

> "You are anxious."

Instead:

> "You seem unsure about this concept. Let's try a simpler example."

---

## 12. Adaptability Score

ATLAS should measure whether the student can transfer knowledge.

Example:

Student learns: Area of a rectangle = length × width

Then receives:

- **Question 1:** Find area of 5 × 4.
- **Question 2:** A garden is 5m long and 4m wide. How much space does it cover?
- **Question 3:** A rectangular room has an area of 20m². If width is 4m, find length.

Ability to transfer knowledge increases the adaptability score.

---

## 13. Cascading Notes

Instead of traditional long notes, ATLAS should have Cascading Notes.

The idea:

```
Topic
 ↓
Overview
 ↓
Core Concept
 ↓
Explanation
 ↓
Example
 ↓
Common Mistake
 ↓
Practice
```

Example — Switching:

```
Overview
Switching allows devices on a network to communicate efficiently.

↓
Core Concept
A network switch forwards frames using MAC addresses.

↓
How it works
1. Frame arrives
2. Switch checks destination MAC
3. Switch looks at MAC address table
4. Frame is forwarded

↓
Example
Computer A sends data to Computer B.

↓
Common misconception
Switches primarily use MAC addresses for Layer 2 forwarding;
IP addresses are associated with Layer 3 routing.

↓
Quick Check
Which address does a Layer 2 switch use for forwarding?
```

The student can expand/collapse each level.

---

## 14. Adaptive Cascading Notes

Cascading Notes should also adapt.

For a struggling student:

```
Concept
 ↓
Simple explanation
 ↓
Analogy
 ↓
Example
 ↓
Practice
```

For a strong student:

```
Concept
 ↓
Advanced example
 ↓
Edge case
 ↓
Challenge question
```

The notes should be grounded in the curriculum Knowledge Base.

---

## 15. Practice Engine

ATLAS should generate/serve practice questions based on:

- Current topic
- Mastery
- Mistakes
- Difficulty
- Previous performance

Question types:

- MCQ
- Short answer
- True/False
- Fill in the blank
- Numerical
- Coding
- Conceptual
- Scenario-based

The backend should evaluate answers where possible.

---

## 16. Flashcard Revision

Instead of calling them "flash notes", create a Flashcard Revision module.

Cards can be:

```
Front:
What does ARP do?

↓

Back:
Maps an IPv4 address to a MAC address within a local network.
```

After reviewing:

```
😕 Didn't know
🤔 Almost
😊 Knew it
🔥 Easy
```

These responses should influence the learning model.

---

## 17. Personalized Revision

If Routing mastery = 45%, ATLAS can automatically generate:

```
🎯 Your Routing Revision

8 cards
3 weak concepts
2 previous mistakes
1 challenge
```

This is much better than random flashcards.

---

## 18. Gamification

Gamification should motivate learning without becoming meaningless decoration.

Components:

- XP
- Levels
- Streaks
- Badges
- Daily Goals
- Achievements
- Topic Completion
- Challenges
- Milestones

Example:

```
⭐ 1,240 XP
🔥 6 day streak
🏆 8 badges

Today's Goal

████████░░ 80%

+20 XP  Cascading Notes
+40 XP  Practice
+50 XP  Focus Session
```

Do not reward only correct answers.

Reward productive learning behaviors such as:

- Attempting difficult questions
- Completing revision
- Correcting mistakes
- Completing focus sessions
- Returning to weak topics
- Demonstrating knowledge transfer

---

## 19. Focus Mode

ATLAS should have a dedicated Focus Mode.

Student chooses:

- 25 minutes
- 45 minutes
- 60 minutes
- Custom

Example:

```
🎯 Focus Mode

Topic:
Computer Networks → Routing

Duration:
45 minutes

[ Start Focus ]
```

---

## 20. Focus Session Structure

ATLAS can intelligently divide a session:

```
45-minute session

0–5 min     Quick revision
5–20 min    Learn
20–30 min   Practice
30–38 min   Cascading Notes / Revision
38–43 min   Mini Assessment
43–45 min   Reflection
```

The schedule can adapt depending on the student's learning state.

---

## 21. Tab Switching / Attention Nudges

The frontend can use browser visibility APIs to detect when the student leaves the application/tab.

Important: Do NOT claim:

> "You aren't paying attention."

Instead use polite nudges:

> 👋 Looks like you stepped away.
> Your focus session is still running. Come back when you're ready.

When they return:

> Welcome back! 🌱
> You have 18 minutes remaining.

The system should distinguish:

```
Focus session started
        ↓
Tab visible
        ↓
Tab hidden
        ↓
Interruption recorded
        ↓
Tab visible again
        ↓
Session continues
```

This is a study-support feature, not surveillance.

---

## 22. Pomodoro

Focus Mode should support:

- 25 min study / 5 min break
- or 45 min study / 10 min break
- or custom:

```
Study: 40 min
Break: 10 min
Rounds: 3
```

---

## 23. Focus Analytics

Record:

- session duration
- planned duration
- actual active time
- number of tab switches
- breaks
- topic
- concepts studied
- questions attempted
- session completion

Use this for learning analytics.

Do not use it to make psychological claims.

---

## 24. Backend Architecture

Use: **Python + FastAPI**

Architecture:

```
ATLAS Backend

app/
│
├── main.py
│
├── api/
│   ├── routes/
│   │   ├── chat.py
│   │   ├── students.py
│   │   ├── progress.py
│   │   ├── assessments.py
│   │   ├── flashcards.py
│   │   ├── focus.py
│   │   ├── feedback.py
│   │   └── gamification.py
│   │
│   └── dependencies.py
│
├── agents/
│   └── foundry_agent.py
│
├── services/
│   ├── tutor_service.py
│   ├── student_service.py
│   ├── assessment_service.py
│   ├── adaptation_service.py
│   ├── flashcard_service.py
│   ├── focus_service.py
│   ├── gamification_service.py
│   └── feedback_service.py
│
├── models/
│   ├── student.py
│   ├── learning_state.py
│   ├── concept.py
│   ├── assessment.py
│   ├── flashcard.py
│   ├── focus_session.py
│   └── session.py
│
├── schemas/
│   ├── student.py
│   ├── chat.py
│   ├── progress.py
│   ├── assessment.py
│   ├── flashcard.py
│   └── focus.py
│
├── database/
│   ├── database.py
│   └── repositories/
│
└── core/
    ├── config.py
    └── security.py
```

---

## 25. Database

Start with: **SQLite for development**

Later: **PostgreSQL**

Tables:

- students
- subjects
- topics
- concepts
- learning_states
- mistakes
- sessions
- messages
- assessments
- questions
- answers
- flashcards
- flashcard_reviews
- focus_sessions
- student_xp
- achievements
- streaks
- daily_goals
- feedback

---

## 26. API Architecture

The frontend should NEVER directly access Azure secrets.

Architecture:

```
Lovable Frontend
       ↓
     HTTPS
       ↓
FastAPI Backend
       ↓
ATLAS Services
       ↓
Microsoft Foundry
```

---

## 27. Core API Endpoints

### Chat

`POST /api/chat`

Request:

```json
{
  "student_id": "S001",
  "message": "I don't understand routing",
  "subject": "Computer Networks",
  "topic": "Routing"
}
```

Response:

```json
{
  "reply": "...",
  "student_state": {
    "mastery": 0.64,
    "confidence": 0.55
  }
}
```

### Student

`GET /api/students/{student_id}`

### Progress

`GET /api/students/{student_id}/progress`

### Cascading Notes

`GET /api/topics/{topic_id}/notes`

### Flashcards

`GET /api/students/{student_id}/flashcards`

Submit Flashcard Review:

`POST /api/flashcards/{flashcard_id}/review`

### Assessment

`POST /api/assessments`

`POST /api/assessments/{assessment_id}/submit`

### Focus

`POST /api/focus/start`

`POST /api/focus/{session_id}/interrupt`

`POST /api/focus/{session_id}/complete`

### Gamification

`GET /api/students/{student_id}/gamification`

### Feedback

`POST /api/feedback`

---

## 28. Frontend

Frontend teammate will build using: **Lovable**

Likely:

- React
- TypeScript
- Tailwind

Frontend screens:

- Login
- Dashboard
- AI Tutor
- Cascading Notes
- Practice
- Flashcards
- Focus Mode
- Progress
- Achievements
- Profile

Potential parent dashboard:

```
Parent Dashboard
├── Learning Progress
├── Topics Covered
├── Strengths
├── Areas Needing Practice
├── Study Sessions
└── Feedback
```

Parent dashboard should expose learning information without unnecessarily exposing private student conversations.

---

## 29. Frontend ↔ Backend Contract

The backend must provide predictable JSON APIs.

Example:

```
Lovable
   |
   | POST /api/chat
   ↓
FastAPI
   |
   ↓
Student Service
   |
   ↓
Learning State
   |
   ↓
Foundry ATLAS
   |
   ↓
Response
   |
   ↓
Learning State Update
   |
   ↓
Lovable
```

The frontend developer should never need to know:

- Azure credentials
- Foundry credentials
- Search credentials
- Database credentials

---

## 30. Environment Variables

Use `.env`:

```
AZURE_AI_PROJECT_ENDPOINT=...
AZURE_AI_AGENT_NAME=ATLAS
AZURE_AI_AGENT_VERSION=26

DATABASE_URL=...

CORS_ORIGINS=...
```

Never expose these in frontend code.

Never commit `.env` to GitHub.

---

## 31. Knowledge Grounding

ATLAS should use a curriculum knowledge base.

Current:

```
Azure AI Search
      ↓
atlas-tutor-search
      ↓
Foundry IQ
      ↓
atlas-learning-kb
      ↓
Computer Networking
```

Future:

- Mathematics
- Physics
- Computer Science
- Chemistry
- etc.

The AI should prioritize the student's curriculum material.

Avoid uncontrolled web search when curriculum grounding is required.

---

## 32. Multilingual Support

ATLAS should support:

- English
- Hindi
- Hinglish

Later:

- Punjabi
- Other Indian languages

The tutor should naturally match the student's language.

Example:

**Student:**
Sir mujhe routing samajh nahi aa rahi.

**ATLAS:**
No worries 😄 Let's break routing into a very simple example...

---

## 33. Voice

Future module:

```
Student speaks
      ↓
Azure Speech-to-Text
      ↓
ATLAS
      ↓
Response
      ↓
Azure Text-to-Speech
      ↓
Student hears response
```

Support:

- Speech recognition
- Text-to-speech
- Multiple voices
- Multiple languages
- SSML where appropriate

---

## 34. Feedback System

Student can say:

```
👍 Helpful
👎 Not helpful
😕 Still confused
💡 Too easy
🔥 Too difficult
```

Feedback should influence future tutoring.

Example: Student says "Still confused"

```
        ↓

ATLAS:
Simplify explanation
Use analogy
Reduce difficulty
Ask diagnostic question
```

---

## 35. Parent Feedback

Parents can provide structured feedback such as:

```
Topic:
Mathematics

Feedback:
Student is struggling with algebra practice.

Suggested support:
More practice questions.
```

The backend should distinguish:

- student feedback
- parent feedback
- system observations

---

## 36. Safety

ATLAS should NOT diagnose:

- ADHD
- Depression
- Anxiety
- Dyslexia
- Mental illness
- Medical conditions

It should only describe observable learning behavior.

For example:

Allowed:

> "The student has repeatedly struggled with fraction subtraction."

Not:

> "The student has a learning disorder."

---

## 37. Reliability

ATLAS should:

- Ground curriculum answers
- Admit uncertainty
- Avoid fabricating sources
- Use knowledge-base citations where available
- Avoid pretending to remember unavailable information
- Stay within the current topic
- Ask clarification when necessary

---

## 38. Topic Drift

ATLAS should maintain current learning context.

If student asks a related question:

```
Connect → answer → return to lesson
```

If completely unrelated:

> "We can switch to that. Do you want to finish Routing first or switch topics?"

If asking whether to switch, do not immediately answer the unrelated topic.

---

## 39. Adaptive Learning Loop

The central intelligence loop:

```
Student
   ↓
Interaction
   ↓
ATLAS
   ↓
Assessment
   ↓
Learning Signals
   ↓
Student Model
   ↓
Adaptation Engine
   ↓
Next Activity
   ↓
Student
```

Signals:

- Correctness
- Confidence
- Response time
- Hints needed
- Repeated mistakes
- Transfer ability
- Feedback
- Focus sessions
- Flashcard performance
- Assessment performance

---

## 40. Example Complete Learning Journey

Student logs in.

```
Mastery:
Routing = 48%
```

ATLAS recommends:

> 🎯 Let's strengthen Routing.

Student opens Cascading Notes. ATLAS teaches:

```
Routing
 ↓
What is routing?
 ↓
How routers work
 ↓
Routing tables
 ↓
Example
```

Student completes a quick check. Gets it wrong.

Backend records:

```
Misconception:
confuses routing table with MAC table
```

ATLAS adapts.

Then:

```
Practice
 ↓
5 questions
 ↓
3 correct
 ↓
Mastery → 58%
```

ATLAS recommends:

> You improved! Let's reinforce this with 5 revision cards.

Student completes flashcards. Then:

> 🎯 Want to do a 25-minute Focus Session?

Student starts Focus Mode. After session:

```
Routing
48% → 67%

+120 XP
🔥 Streak maintained
🏆 Routing Explorer badge
```

This is the complete ATLAS learning loop.

---

## 41. Development Strategy

Do NOT attempt everything simultaneously.

Build in phases.

**Phase 1**

- FastAPI
- Health endpoint
- Configuration
- Database
- Foundry connection

**Phase 2**

- Student model
- Chat API
- Session management

**Phase 3**

- Mastery
- Confidence
- Misconceptions
- Adaptive learning

**Phase 4**

- Cascading Notes
- Practice
- Flashcards

**Phase 5**

- Gamification
- XP
- Badges
- Streaks
- Goals

**Phase 6**

- Focus Mode
- Pomodoro
- Session analytics

**Phase 7**

- Voice
- Multilingual
- Parent feedback

**Phase 8**

- Frontend integration
- Testing
- Evaluation
- Deployment

---

## 42. Team Division

**Backend developer** — responsible for:

- FastAPI
- Database
- AI integration
- Foundry
- Student model
- Adaptive engine
- Assessment
- Flashcards
- Gamification
- Focus APIs
- Security
- API documentation

**Frontend developer** — using Lovable:

- Dashboard
- Chat UI
- Cascading Notes UI
- Practice UI
- Flashcard UI
- Focus UI
- Progress charts
- Gamification UI
- Parent dashboard
- Responsive design

---

## 43. Most Important Rule

The backend and frontend must communicate through a well-defined API contract.

Do not allow the frontend developer to directly implement learning logic.

For example:

Bad:

```
Frontend calculates mastery
Frontend decides next topic
Frontend calculates XP
```

Better:

```
Frontend
   ↓
Backend
   ↓
Learning Engine
   ↓
Result
   ↓
Frontend displays it
```

The frontend is responsible for presentation.

The backend is responsible for intelligence and state.

---

## 44. Final ATLAS Architecture

```
                         ┌──────────────────────┐
                         │    LOVABLE FRONTEND  │
                         │                      │
                         │ Dashboard            │
                         │ AI Tutor             │
                         │ Cascading Notes      │
                         │ Practice             │
                         │ Flashcards           │
                         │ Focus Mode           │
                         │ Progress             │
                         │ Gamification         │
                         └──────────┬───────────┘
                                    │
                              REST / HTTPS
                                    │
                                    ▼
                    ┌────────────────────────────┐
                    │       FASTAPI BACKEND      │
                    │                            │
                    │ API Layer                  │
                    │ Authentication             │
                    │ Student Service            │
                    │ Tutor Service              │
                    │ Assessment Engine          │
                    │ Adaptation Engine          │
                    │ Flashcard Service          │
                    │ Gamification Service       │
                    │ Focus Service              │
                    │ Feedback Service           │
                    └─────────────┬──────────────┘
                                  │
                 ┌────────────────┼────────────────┐
                 │                │                │
                 ▼                ▼                ▼
          ┌────────────┐   ┌──────────────┐  ┌──────────────┐
          │ PostgreSQL │   │ Microsoft    │  │ Azure AI     │
          │ Database   │   │ Foundry      │  │ Search       │
          │            │   │ ATLAS Agent  │  │ Knowledge    │
          └────────────┘   └──────┬───────┘  └──────────────┘
                                  │
                                  ▼
                           ┌─────────────┐
                           │ GPT-5 mini  │
                           └─────────────┘
```

The central idea: ATLAS should not just be an AI chatbot. It should be a closed-loop adaptive learning system where every meaningful interaction can improve the student's learning model and influence what ATLAS presents next.
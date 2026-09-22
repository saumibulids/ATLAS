# ATLAS — Adaptive Tutor for Learning, Assessment & Support

> **A tutor that learns how you learn.**

ATLAS is an adaptive AI tutoring system designed to provide personalized learning experiences based on a student's learning behavior, progress, mistakes, confidence signals, pace, and feedback.

Instead of treating every student the same way, ATLAS maintains a structured learning model and adapts tutoring, practice, assessment, and revision around the learner.

---

## 🚀 Overview

Traditional AI chatbots can answer questions, but answering a question is not the same as helping someone learn.

ATLAS is designed around a different approach:

**Understand → Teach → Assess → Adapt → Practice → Track**

The system keeps track of observable learning signals such as:

- Topic mastery
- Concept-level understanding
- Learning pace
- Confidence signals
- Repeated mistakes
- Learning preferences
- Assessment performance
- Learning history
- Student feedback

These signals are used to adapt the tutoring experience rather than simply generating another generic answer.

> ATLAS focuses on observable learning behavior. It does not attempt to diagnose medical or psychological conditions.

---

## 🎯 Problem

Generic AI tutoring often has several limitations:

- The same explanation may be given to every learner.
- Previous learning context can be lost.
- Repeated misconceptions may not be tracked.
- Difficulty may not adapt to the learner.
- Students can receive answers without actually understanding the concept.
- Progress and learning behavior are often disconnected from the tutoring experience.

ATLAS addresses these problems by combining an AI tutor with a structured **Student Learning Model**.

---

## 💡 Solution

ATLAS combines:

**AI tutoring + assessments + personalization + progress tracking + knowledge grounding + learning analytics**

The backend maintains the learning state and acts as the source of truth for:

- Mastery
- Assessment results
- XP
- Gamification
- Focus sessions
- Learning progress
- Adaptive next activities

The frontend focuses on presenting the learning experience.

---

# ✨ Key Features

## 🤖 Adaptive AI Tutor

ATLAS provides conversational tutoring through a Microsoft Foundry agent.

The tutor is designed to:

- Explain concepts step-by-step
- Adapt explanations to the learner
- Ask questions instead of always giving answers
- Use examples and analogies
- Track the current learning topic
- Handle topic drift
- Use learning context from previous interactions

The current backend supports both development/mock responses and Microsoft Foundry integration.


## 📁 PROJECT STRUCTURE

```text
ATLAS/
│
├── backend/
│   ├── app/
│   │   ├── agents/
│   │   ├── api/
│   │   ├── services/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── database/
│   │   └── core/
│   │
│   ├── scripts/
│   ├── tests/
│   └── README.md
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   └── ...
│   │
│   ├── package.json
│   └── .env.example
│
├── docs/
│   ├── ATLAS_SPEC.md
│   ├── API_CONTRACT.md
│   └── PROGRESS.md
│
├── .gitignore
└── README.md
```


## ⚙️ Getting Started

### Prerequisites

Make sure you have the following installed:

- Python
- Node.js
- npm
- Git
- Azure CLI

For real Microsoft Foundry authentication, you also need an Azure account with access to the ATLAS Foundry project.

---

### 1. Clone the Repository

```bash
git clone https://github.com/saumibulids/ATLAS.git
cd ATLAS
```
---
### 2. Backend Setup

Create and activate a Python virtual environment.

#### Windows

```powershell
python -m venv .venv
.venv\Scripts\activate
```
Install the backend dependencies:

```powershell
pip install -r requirements.txt
```

Seed the development database:
```powershell
python scripts/seed_db.py
```
Start the FastAPI backend:
```powershell
uvicorn app.main:app --reload
```
The backend will be available at:
```text
http://localhost:8000
```
---
### 3. Frontend Setup
Open a new terminal from the project root:
```bash
cd frontend
```
Install the frontend dependencies:
```bash
npm install
```
Start the development server:

```bash
npm run dev
```
The frontend will be available at:
```text
http://localhost:3000
```

---
###📌 Project Status
```text
ATLAS is an actively developed project.
The current repository contains the working frontend/backend
integration and the core adaptive tutoring infrastructure. 
Additional capabilities are being developed incrementally.
```
---

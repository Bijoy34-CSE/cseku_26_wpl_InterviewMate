# InterviewMate

**AI-Powered Interview & Viva Preparation Platform**

InterviewMate is a free, AI-powered web application that helps students and job seekers prepare for viva examinations, technical interviews, and HR interviews through interactive, adaptive practice sessions. Users can provide interview context by uploading a supported document or entering/pasting text. The AI system analyzes the context, generates context-aware questions, evaluates answers, gives feedback, and adapts future questions based on performance, topic coverage, and remaining interview time.

| | |
|---|---|
| **Version** | 1.0 |
| **Project Phase** | Week 2 |
| **Target Users** | Students, job seekers, interview and viva candidates |
| **Primary Platform** | Web Application |

## Table of Contents

- [Problem It Solves](#problem-it-solves)
- [Key Features (MVP)](#key-features-mvp)
- [Out of Scope for MVP](#out-of-scope-for-mvp)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [API Overview](#api-overview)
- [Development Workflow](#development-workflow)
- [Documentation](#documentation)
- [Team](#team)

## Problem It Solves

Students and job seekers often prepare for interviews using static question lists, videos, or generic chatbots. These approaches may not provide structured practice based on the specific company, job, project, course, or other context relevant to the candidate. InterviewMate addresses this by allowing users to submit a document or text as interview context. The system analyzes that context, conducts an adaptive interview, evaluates answers, provides feedback, and selects subsequent questions based on the supplied context and the user's performance.

## Key Features (MVP)

- User registration, login, logout, and secure authenticated access
- Interview type selection: **Viva**, **Technical**, **HR**
- Optional interview focus/topic and initial difficulty selection
- Supported document upload or text/paste submission as interview context
- Document processing and context analysis
- AI-generated, context-aware interview questions
- Text-based answer submission
- AI-based answer scoring and feedback (strengths, weaknesses, improvement tips)
- Adaptive question selection based on context, previous answers, performance, topic coverage, and remaining interview time
- Default **5-minute interview duration**
- Countdown timer during an active interview
- User-controlled early interview exit
- Automatic interview completion when the 5-minute duration expires or the user leaves
- Final interview summary with overall score
- Interview history, including early-ended sessions
- Basic performance dashboard

## Out of Scope for MVP

- Voice-based interviews and speech recognition
- Video interviews and facial-expression analysis
- Real-time emotion detection
- AI interviewer avatar
- Automatic resume parsing
- Mobile application
- Advanced multilingual speech interaction
- Complex administrator analytics

Future enhancements may include voice-based interview and speech-to-text, text-to-speech AI interviewer, video simulation, non-verbal behavior analysis, resume-based personalization, multilingual practice, AI interviewer avatar, advanced analytics, and a mobile application.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React.js (Vite), plain CSS / Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | MongoDB (Mongoose) |
| Auth | JWT, bcrypt |
| AI | External LLM API (e.g. Claude), structured prompt/response handling |
| Version Control | Git + GitHub |
| UI Design | Figma / AI-assisted design tool |
| Deployment | Vercel (frontend) + Render/Railway (backend), or equivalent |

## System Architecture

Users (examinees, with an optional administrator in a later release) interact with the **frontend** web application, which communicates with the **backend** through a REST API.

The backend coordinates:

- Authentication and protected access
- Context/document submission and processing
- Interview session management and timer state
- Question management
- Answer evaluation and analytics
- AI and agentic workflow coordination

AI-specific work is delegated to an **AI & Agentic Services** layer:

- **Interview Manager** — controls interview state, question count, performance context, remaining time, and the next action
- **Question Agent** — generates an appropriate question using context, topic, interview type, and target difficulty
- **Evaluation Agent** — analyzes the user's answer and produces a score
- **Feedback Agent** — produces strengths, weaknesses, and actionable improvement advice
- **Adaptive Decision Logic** — uses performance signals, covered topics, and remaining time to influence the next question's difficulty or focus

All persistent data is stored in MongoDB. External services such as the LLM/AI API, email, cloud storage, and monitoring/logging may be integrated at the edges of the system.

```text
User
  |
  v
Frontend Web App
  |
  v
Backend REST API
  |
  +--> Authentication
  +--> Context / Document Processing
  +--> Interview Manager
  +--> Question / Answer Management
  +--> Results / History / Dashboard
  |
  v
AI & Agentic Services
  +--> Question Agent
  +--> Evaluation Agent
  +--> Feedback Agent
  +--> Adaptive Decision Logic
  |
  v
MongoDB

External AI / LLM API <---- Backend
```

Data relationship:

```text
User (1) ───< Interview (1) ───< InterviewQuestion
```

## Getting Started

> Prerequisites: Node.js (LTS), npm, a MongoDB instance (local or Atlas), and an API key for the AI service.

```bash
# Clone the repository
git clone https://github.com/<org>/interviewmate.git
cd interviewmate

# Backend
cd backend
npm install
cp .env.example .env   # fill in your local values
npm run dev

# Frontend (in a separate terminal)
cd frontend
npm install
npm run dev
```

The frontend will typically run on `http://localhost:5173` and the backend API on `http://localhost:5000` (adjust per your local `.env`).

## Environment Variables

Never commit real secrets. Copy `.env.example` to `.env` and fill in your own values locally.

```env
MONGODB_URI=
JWT_SECRET=
AI_API_KEY=
PORT=
```

## Project Structure

```text
interviewmate/
├── frontend/     # React + Vite web app
├── backend/      # Node.js + Express API, AI agent services, MongoDB models
├── docs/         # SRS, tasks.md, AI usage log, diagrams
└── scripts/      # Utility/dev scripts
```

## API Overview

REST-style HTTP APIs. Initial groups include:

| API Group | Example Operations |
|---|---|
| Authentication | `POST /api/auth/register`, `POST /api/auth/login` |
| Contexts / Documents | `POST /api/contexts`, `POST /api/contexts/upload`, `GET /api/contexts/:id` |
| Interviews | `POST /api/interviews`, `GET /api/interviews`, `GET /api/interviews/:id`, `POST /api/interviews/:id/leave` |
| Questions / Answers | `POST /api/interviews/:id/questions`, `POST /api/questions/:id/answer` |
| Dashboard | `GET /api/dashboard` |

AI service requests should carry only the context needed for the current operation, such as interview type, subject/focus, difficulty, previous performance, topic coverage, remaining time, and the user's answer. AI credentials are stored server-side only and are never exposed to the frontend.

## Development Workflow

This project follows an Agile, sprint-based workflow with GitHub Issues, a project board, feature branches, and mandatory PR review. See **[CONTRIBUTING.md](./CONTRIBUTING.md)** for the branching model, commit conventions, PR process, Definition of Done, and AI-assisted development policy. See **[docs/tasks.md](./docs/tasks.md)** for the current task backlog.

## Documentation

- `docs/InterviewMate_SRS.docx` — full Software Requirements Specification
- `docs/tasks.md` — task backlog, organized by sprint week
- `docs/ai-usage-log.md` — log of how AI tools contributed to the project

## Team

- Bijoy Kumar Paul — Student ID: 220234
- Suvro Dev Mojumder — Student ID: 220237
- Computer Science and Engineering, Khulna University

Supervisor:
Prof. Dr. Kazi Masudul Alam

Course:
Web Programming/Mobile Applications Development Laboratory

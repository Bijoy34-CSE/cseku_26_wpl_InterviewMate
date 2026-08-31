# InterviewMate

**Your Adaptive AI Partner for Any Viva or Interview**

InterviewMate is a professional, AI-powered web application for preparing for **any interview or viva**. It supports job interviews, university course/subject vivas, academic oral examinations, internships, scholarship/admission interviews, certification preparation, and custom preparation scenarios.

Users select what they are preparing for, configure an interview, add context materials, and practice through an adaptive AI interviewer. The system analyzes the selected purpose, uploaded context, previous answers, performance, topic coverage, and remaining interview time to generate relevant questions, evaluate answers, adapt difficulty, and provide personalized feedback.

> **Core positioning:** AI-powered preparation for any interview or viva.

---

## Project Information

| | |
|---|---|
| **Project Name** | InterviewMate |
| **Version** | 2.0 |
| **Project Phase** | Week 2 |
| **Target Users** | Students, job seekers, interview and viva candidates |
| **Primary Platform** | Web Application |

---

## Table of Contents

- [What InterviewMate Does](#what-interviewmate-does)
- [Supported Preparation Contexts](#supported-preparation-contexts)
- [Key Features (MVP)](#key-features-mvp)
- [Product Flow](#product-flow)
- [UI/UX Design Direction](#uiux-design-direction)
- [AI and Agentic Interview](#ai-and-agentic-interview)
- [MVP and Future Scope](#mvp-and-future-scope)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [API Overview](#api-overview)
- [Development Workflow](#development-workflow)
- [Documentation](#documentation)
- [Team](#team)

---

## What InterviewMate Does

Traditional interview preparation often relies on static question lists, videos, or generic chatbots. These approaches may not reflect the user's specific company, role, project, course, subject, study material, or other preparation context.

InterviewMate provides a **context-aware and adaptive preparation loop**:

1. Choose what you are preparing for.
2. Configure the interview.
3. Add relevant context materials.
4. Start the AI interview.
5. Answer the generated question.
6. AI analyzes the answer.
7. AI adapts the next question.
8. Complete the interview.
9. Review feedback and performance.
10. Practice weak areas and improve readiness.

---

## Supported Preparation Contexts

InterviewMate is **not limited to job seekers**.

Supported preparation purposes include:

- **Job Interview**
- **Course / Subject Viva**
- **Internship Interview**
- **Academic / Oral Exam**
- **Scholarship / Admission Interview**
- **Certification Preparation**
- **Custom / Other**

Examples of custom preparation:

- `CSE Database Systems viva`
- `Software engineering job interview`
- `Networking course oral exam`
- `Machine learning internship`

The selected purpose influences the entire interview session.

---

## Key Features (MVP)

### Authentication

- User registration
- Login and logout
- Secure password hashing
- JWT-based authentication
- Protected user data and interview history

### Context-Aware Preparation

- Upload supported context documents
- Enter or paste interview/study context as text
- Document processing and context extraction
- Context analysis for relevant information
- Context-specific question generation
- Multiple context sources per preparation session
- Processing, ready, success, and error states

Supported context may include:

- PDF
- DOCX
- TXT
- Images where supported
- Resume/CV
- Lecture/course materials
- Job descriptions
- Study materials
- Project documents
- Portfolio documents

### Interview Configuration

A step-by-step setup flow allows users to configure:

1. **Preparation Purpose**
2. **Interview Type**
3. **Difficulty**
4. **Experience / Academic Level**
5. **Duration**
6. **Number of Questions**
7. **Interaction Mode**
8. **Context Materials**
9. **Interview Preview**

Interview types include:

- Technical
- Behavioral
- Situational
- Subject Viva
- Mixed
- Custom

Difficulty options:

- Easy
- Medium
- Hard
- Adaptive

> **Recommended:** Adaptive — AI adjusts difficulty based on performance.

Experience/academic levels may include:

- Beginner
- Intermediate
- Advanced
- Undergraduate
- Graduate
- Other

Duration options can include:

- 5 minutes
- 10 minutes
- 15 minutes
- 20 minutes
- 30 minutes
- Custom

Question-count options can include:

- 5
- 10
- 15
- 20
- Custom

### Text Interview

The MVP provides text-based interview interaction:

- AI-generated questions
- Large answer area
- Submit Answer
- Skip Question
- AI answer analysis
- Adaptive follow-up questions
- Countdown timer
- Early exit
- Final results

### Adaptive AI Interview

InterviewMate does **not** use a fixed question list.

The adaptive engine can consider:

- Previous answers
- Answer quality
- Technical accuracy
- Communication quality
- Difficulty handling
- Strengths and weaknesses
- Uploaded context
- Preparation purpose
- Selected difficulty
- Experience/academic level
- Topic coverage
- Remaining interview time

Examples:

- Weak answer → simpler or more foundational follow-up
- Strong answer → harder question or new relevant topic
- Repeated weakness → additional questions on that area

### Results and Feedback

After an interview, users can receive:

- Overall score
- Performance summary
- Communication score
- Technical knowledge score
- Confidence score where supported
- Answer relevance
- Answer quality
- Strengths
- Areas to improve
- Personalized AI feedback
- Question-level performance
- Suggested better answers
- Recommended practice

### Performance and Readiness

The product can track:

- Total interviews
- Average score
- Highest score
- Current streak
- Performance over time
- Overall score trend
- Communication trend
- Technical trend
- Confidence trend
- Answer relevance trend
- Strongest skills
- Skills requiring improvement
- Recent history

**Career & Academic Readiness** is designed for both professional and academic preparation. Depending on the user's history, it may show:

- Overall Readiness Score
- Interview Readiness
- Communication Readiness
- Technical Readiness
- Subject Knowledge Readiness
- Resume Readiness when job-related
- Academic Preparation Readiness when academic-related
- Strength Areas
- Skill Gaps
- Personalized AI Recommendations

---

## Product Flow

```text
Landing Page
    ↓
Sign Up / Login
    ↓
Dashboard
    ↓
Profile & Personalization
    ↓
Start Interview
    ↓
Preparation Purpose
    ↓
Interview Type
    ↓
Difficulty
    ↓
Experience / Academic Level
    ↓
Duration
    ↓
Number of Questions
    ↓
Text / Voice* 
    ↓
Context Materials
    ↓
Interview Preview
    ↓
AI Interview
    ↓
User Answer
    ↓
AI Analysis
    ↓
Adaptive Next Question
    ↓
Interview Completed
    ↓
AI Feedback
    ↓
Performance Analytics
    ↓
Recommended Practice
    ↓
Career / Academic Readiness

* Voice interaction is designed as a future enhancement unless included in the MVP.
```

---

## UI/UX Design Direction

InterviewMate follows a professional, modern **AI SaaS** design direction.

### Design Principles

- Clean and trustworthy
- Student-friendly and career-friendly
- Professional and practical
- Accessible
- Responsive
- Clear visual hierarchy
- Generous whitespace
- Consistent interaction patterns
- Minimal professional iconography
- Avoid excessive futuristic/cyberpunk styling

### Visual Design

The interface should use:

- White/light backgrounds
- Blue/indigo primary accent
- Subtle gradients
- Soft neutral colors
- Rounded cards and buttons
- Modern sans-serif typography
- Accessible contrast
- Consistent spacing

### Application Shell

The primary authenticated navigation includes:

- Dashboard
- Start Interview
- Mock Interviews
- Practice
- Performance
- Career / Academic Readiness
- Profile
- Settings

Lower navigation:

- Help
- User Profile
- Logout

The main desktop design target is **1440px**, with responsive layouts for tablet and mobile web browsers.

### Required Screens

The product UI/UX covers:

1. Landing Page
2. Login
3. Sign Up
4. User Dashboard
5. Start Interview / Configuration
6. Interview Preview
7. AI Mock Interview
8. Interview Completed
9. AI Feedback & Results
10. Performance Analytics
11. Practice Questions
12. Career / Academic Readiness
13. Profile & Personalization
14. Settings

### AI-Specific UX Components

Reusable AI components include:

- AI Avatar / identity representation
- Thinking / processing indicator
- Listening / speaking indicator for future voice mode
- Voice waveform for future voice mode
- Answer analysis indicator
- Adaptive difficulty indicator
- AI recommendation cards
- AI feedback/insight cards
- Context source cards
- Document processing status

Example AI states:

```text
Analyzing your answer...
Preparing a follow-up question...
Adjusting difficulty...
Using your uploaded course material...
```

---

## AI and Agentic Interview

InterviewMate uses an **agentic workflow**, rather than treating the system as a single one-shot chatbot.

### Agentic Components

**Interview Manager**

- Controls interview state
- Tracks question count
- Maintains performance context
- Tracks remaining time
- Determines the next interview action

**Question Agent**

- Generates relevant questions
- Uses preparation context
- Considers interview type
- Uses topic and target difficulty

**Evaluation Agent**

- Analyzes the user's answer
- Evaluates it against the question and relevant context
- Produces a numerical score

**Feedback Agent**

- Identifies strengths
- Identifies weaknesses
- Produces actionable improvement advice

**Adaptive Decision Logic**

- Uses performance signals
- Considers covered topics
- Considers remaining time
- Influences the next question's difficulty or focus

### AI Safety and Reliability

AI outputs should:

- Follow a structured format
- Be validated before storage/display
- Stay within the defined scoring range
- Trigger controlled retry/error handling when invalid
- Be presented as automated assistance rather than absolute human judgment

---

## MVP and Future Scope

### MVP

The current MVP focuses on the complete text-based preparation loop:

- Authentication
- Dashboard
- Preparation-purpose selection
- Interview configuration
- Context/document submission
- Document processing and context analysis
- AI question generation
- Text answer submission
- AI answer evaluation
- Scoring and feedback
- Adaptive questioning
- Default 5-minute interview timer
- Early interview exit
- Interview result
- Interview history
- Basic performance analytics
- AI/API error handling
- Protected user data

### Future Enhancements

The UI architecture is designed to support:

- Voice-based interviews
- Speech-to-text
- Text-to-speech AI interviewer
- Video interview simulation
- Facial-expression/non-verbal behavior analysis
- Real-time emotion detection
- AI interviewer avatar
- Automatic resume parsing
- Resume-based personalization
- Multilingual interview practice
- Advanced analytics
- Advanced learning recommendations
- Mobile application
- Expanded administrator analytics

These features should be treated as **future enhancements unless the MVP scope is formally expanded**.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React.js (Vite), plain CSS / Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | MongoDB (Mongoose) |
| Authentication | JWT, bcrypt |
| AI | External LLM API (e.g. Claude), structured prompt/response handling |
| Version Control | Git + GitHub |
| UI Design | Figma / AI-assisted design tool |
| Deployment | Vercel (frontend) + Render/Railway (backend), or equivalent |

---

## System Architecture

Users interact with the frontend web application, which communicates with the backend through a REST API.

The backend coordinates:

- Authentication and protected access
- Context/document submission and processing
- Interview session management
- Timer and session state
- Question management
- Answer evaluation
- Results and analytics
- AI and agentic workflow coordination

AI-specific work is delegated to an **AI & Agentic Services** layer.

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
  |
  +--> Question Agent
  +--> Evaluation Agent
  +--> Feedback Agent
  +--> Adaptive Decision Logic
  |
  v
MongoDB

External AI / LLM API <---- Backend
```

### Data Relationship

```text
User (1) ───< Interview (1) ───< InterviewQuestion
```

---

## Getting Started

### Prerequisites

- Node.js (LTS)
- npm
- MongoDB instance (local or Atlas)
- API key for the configured AI service

### Clone the Repository

```bash
git clone https://github.com/<org>/interviewmate.git
cd interviewmate
```

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

### Frontend

Open a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend will typically run on:

```text
http://localhost:5173
```

The backend API will typically run on:

```text
http://localhost:5000
```

Adjust these values according to the local environment configuration.

---

## Environment Variables

Never commit real secrets to Git.

Copy `.env.example` to `.env` and provide your local values.

```env
MONGODB_URI=
JWT_SECRET=
AI_API_KEY=
PORT=
```

AI credentials must remain server-side and must never be exposed to the frontend.

---

## Project Structure

```text
interviewmate/
├── frontend/     # React + Vite web application
├── backend/      # Node.js + Express API, AI agents, MongoDB models
├── docs/         # SRS, tasks, AI usage log, diagrams
└── scripts/      # Utility/development scripts
```

---

## API Overview

The frontend and backend communicate through REST-style HTTP APIs.

| API Group | Example Operations |
|---|---|
| Authentication | `POST /api/auth/register`, `POST /api/auth/login` |
| Contexts / Documents | `POST /api/contexts`, `POST /api/contexts/upload`, `GET /api/contexts/:id` |
| Interviews | `POST /api/interviews`, `GET /api/interviews`, `GET /api/interviews/:id`, `POST /api/interviews/:id/leave` |
| Questions / Answers | `POST /api/interviews/:id/questions`, `POST /api/questions/:id/answer` |
| Dashboard | `GET /api/dashboard` |

AI service requests should contain only the context required for the current operation, such as:

- Preparation purpose
- Interview type
- Subject/focus
- Difficulty
- Previous performance
- Topic coverage
- Remaining time
- User answer

---

## Development Workflow

The project follows an Agile, sprint-based workflow using:

- GitHub Issues
- GitHub Project Board
- Feature branches
- Pull Requests
- Code review
- Testing
- Documentation

Recommended branch model:

```text
main       → stable release
develop    → integration branch
feature/*  → individual feature branches
```

Recommended project board:

```text
Backlog
   ↓
Todo
   ↓
In Progress
   ↓
Code Review
   ↓
Testing
   ↓
Done
```

See **[CONTRIBUTING.md](./CONTRIBUTING.md)** for branching, commit conventions, PR review, Definition of Done, and AI-assisted development policy.

See **[docs/tasks.md](./docs/tasks.md)** for the current task backlog.

---

## Documentation

- `docs/InterviewMate_SRS.docx` — Software Requirements Specification
- `docs/tasks.md` — Task backlog organized by sprint/week
- `docs/ai-usage-log.md` — Record of AI-assisted development
- `CONTRIBUTING.md` — Development and GitHub workflow

---

## Realistic Product Examples

The product should use realistic examples rather than Lorem Ipsum, including:

- Software Engineer Mock Interview
- Database Systems Viva
- Computer Networks Viva
- Machine Learning Internship Interview
- Operating Systems Oral Exam
- Behavioral Job Interview
- Scholarship Interview

---

## Team

- **Bijoy Kumar Paul** — Student ID: 220234
- **Suvro Dev Mojumder** — Student ID: 220237
- **Computer Science and Engineering, Khulna University**

**Supervisor:**  
Prof. Dr. Kazi Masudul Alam

**Course:**  
Web Programming/Mobile Applications Development Laboratory

---

## Project Goal

InterviewMate is designed as a polished, realistic, student-focused AI SaaS project suitable for:

- University software engineering projects
- Web Programming Lab
- Software demonstrations
- Project presentations
- Final project defense

The core experience is:

> **Choose Purpose → Configure Interview → Add Context → Choose Interaction → AI Asks → User Responds → AI Analyzes → AI Adapts → Complete → Feedback → Analytics → Practice → Improved Readiness**

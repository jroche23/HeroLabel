# HeroLabel

A data annotation and labeling platform inspired by Label Studio Enterprise. Built for multi-user annotation workflows with role-based access, flexible labeling templates, and a full project management system.

![Stack](https://img.shields.io/badge/React-18-blue?logo=react) ![Stack](https://img.shields.io/badge/Bun-1.x-black?logo=bun) ![Stack](https://img.shields.io/badge/Hono-4.6-orange) ![Stack](https://img.shields.io/badge/Prisma-6-teal?logo=prisma)

---

## What It Does

HeroLabel lets teams collaboratively annotate datasets for machine learning projects. You can:

- Create labeling projects with configurable annotation templates
- Upload datasets (CSV, TSV, JSON) and assign tasks to annotators
- Label data through a structured annotation interface with XML-driven templates
- Manage teams with a 5-tier role system (Owner → Administrator → Manager → Reviewer → Annotator)
- Invite members via email, track annotation progress, and review submissions
- Monitor annotator performance via analytics dashboards

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Framer Motion |
| Backend | Bun runtime, Hono framework |
| Database | Prisma ORM + SQLite (PostgreSQL for production) |
| Auth | Better Auth (email OTP, session-based) |
| Validation | Zod (shared between frontend and backend) |

---

## Project Structure

```
HS_replica/
├── webapp/          # React frontend (Vite, port 8000)
│   └── src/
│       ├── pages/       # Route-level components
│       ├── components/  # UI components (labeling, data, layout)
│       └── lib/         # API client, auth helpers
├── backend/         # Hono API server (Bun, port 3000)
│   └── src/
│       ├── routes/      # projects, data, members, performance
│       ├── utils/       # fileParser, permissions
│       └── types.ts     # Zod schemas (shared API contracts)
└── backend/prisma/  # Database schema
```

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1.x
- Node.js 18+ (for tooling)

### Backend

```bash
cd backend
cp .env.example .env        # Set DATABASE_URL and BETTER_AUTH_SECRET
bun install
bunx prisma db push         # Create database tables
bun run dev                 # Starts on port 3000
```

### Frontend

```bash
cd webapp
bun install
bun run dev                 # Starts on port 8000
```

Set `VITE_BACKEND_URL=http://localhost:3000` in `webapp/.env` for local development.

---

## Key Features

### Annotation System
- XML-driven labeling templates (Choices, Taxonomy, TextArea, HyperText, and more)
- Split-panel interface: task list on left, annotation controls on right
- Task-by-task navigation with keyboard shortcuts
- Submission, skipping, and review flow

### Data Management
- Upload CSV/TSV/JSON files — automatically parsed into tasks
- Smart column type detection (text, number, boolean, date, JSON)
- Configurable column visibility and ordering
- Paginated task table with filters

### Team & Organization
- Organization-level and project-level membership
- 5-tier role hierarchy with 14 distinct permissions
- Token-based invitation system with expiry
- Protection against privilege escalation and removing the last owner

### Performance Analytics
- Per-annotator statistics: tasks completed, average time, accuracy
- Date range filtering
- Performance trend visualization

---

## API Overview

All routes return a `{ data: ... }` envelope. Authentication required on all routes except `/api/auth/*`.

```
POST   /api/projects                          Create project
GET    /api/projects                          List projects
POST   /api/projects/:id/tasks/:taskId/annotate   Submit annotation
POST   /api/projects/:projectId/data/upload   Upload dataset
GET    /api/organizations/:orgId/members      List members
POST   /api/organizations/:orgId/members/invite  Invite member
GET    /api/organizations/:orgId/performance/members  Analytics
```

See [`backend/API_DOCUMENTATION.md`](backend/API_DOCUMENTATION.md) for the full reference.

---

## Environment Variables

**Backend (`backend/.env`)**
```
DATABASE_URL=file:./prisma/dev.db
BETTER_AUTH_SECRET=your-secret-here
```

**Frontend (`webapp/.env`)**
```
VITE_BACKEND_URL=http://localhost:3000
```

---

## Status

| Module | Backend | Frontend |
|---|---|---|
| Authentication | Complete | Complete |
| Projects | Complete | Complete |
| Data Management | Complete | Complete |
| Annotations | Complete | Complete |
| Organizations & Members | Complete | Complete |
| Performance Analytics | Complete | Complete |
| Export | Planned | Planned |
| Review Workflow | Planned | Planned |

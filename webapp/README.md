# Label Studio Enterprise Clone

A production-quality, single-page web application replicating the core functionality of HumanSignal's Label Studio Enterprise. Built for data labeling and annotation workflows at scale.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite 5
- **Backend**: Bun + Hono + Prisma (SQLite) + Better Auth
- **Routing**: React Router v6
- **Styling**: Tailwind CSS + shadcn/ui components
- **State**: React Context + useReducer with localStorage persistence
- **Icons**: Lucide React
- **Animations**: Framer Motion

## Screens

1. **Home Dashboard** (`/`) - Welcome page with recent projects, action buttons, and resources
2. **Projects View** (`/projects`) - Workspace sidebar + project grid with search, sort, and create
3. **Data Manager** (`/projects/:id/data`) - Task table with columns, filters, view tabs, and sorting
4. **Labeling Interface** (`/projects/:id/label/:taskId?`) - Split-panel annotation workspace with keyboard shortcuts
5. **Project Settings** (`/projects/:id/settings`) - Multi-tab settings (General, Labeling Interface, etc.)

## Project Creation Flow

The app features a comprehensive project creation system with three main tabs:

### 1. Project General
- **Workspace Selection**: Choose which workspace the project belongs to
- **Project Title**: Required field for project name
- **Project Description**: Optional detailed description

### 2. Data Import
- **File Upload**: Drag & drop or click to browse files
  - Supports: images (jpg, png, gif, etc), audio (wav, mp3, flac), video (mp4, webm), HTML, text, structured data (csv, tsv, json)
- **URL Import**: Add data sources via URL input
- **File Management**: View and remove uploaded files and URLs

### 3. Labeling Setup
- **Template Gallery**: Choose from 8 pre-built templates
  - Computer Vision: Image Captioning, Image Classification, Object Detection
  - NLP: Text Classification, Named Entity Recognition
  - Audio: Audio Classification
  - Video: Video Classification
  - Custom: Build your own
- **Template Builder**: Three modes
  - Template Gallery: Browse and select preset templates
  - Generate with AI: (Coming soon) AI-powered template generation
  - Code: Write custom XML label configuration

### Backend API

Projects are stored in a SQLite database with full CRUD operations:
- `POST /api/projects` - Create new project
- `GET /api/projects` - List all user projects
- `GET /api/projects/:id` - Get project details with templates and imports
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `POST /api/projects/:id/import` - Add data import
- `POST /api/projects/:id/template` - Add labeling template
- `GET /api/projects/templates/presets` - Get preset templates

All routes (except presets) require authentication via Better Auth.

## Design System

- **Primary**: Warm orange (#FF8800) for CTAs and accent highlights
- **Secondary**: Slate blue-gray (#4C5F7A) for headers
- **Success**: Teal green (#2DB89A) for completed states
- **Typography**: Inter font family
- **Theme**: Light mode with dark mode support

## Data

All data is persisted in both localStorage (legacy) and SQLite database:
- Users managed via Better Auth
- Projects with workspaces
- Labeling templates (preset and custom)
- Data imports (files and URLs)
- Tasks with realistic vendor card HTML
- Sample annotations

## Key Features

- Full CRUD for projects and workspaces
- Multi-step project creation with validation
- Template library with 8 preset templates
- File upload with drag & drop support
- URL-based data import
- Task annotation with keyboard shortcuts (1-4 for choices, Enter to submit)
- Resizable split panels in labeling interface
- Configurable table columns in Data Manager
- Live XML config preview in Project Settings
- Breadcrumb navigation
- Search and sort across projects
- Authentication and user management

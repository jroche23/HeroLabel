import type { User, Workspace, Project, Task, Annotation } from '../types';

// ── Users ──────────────────────────────────────────────────────────────────────
// Default user for local development (real users come from Better Auth)
export const seedUsers: User[] = [
  {
    id: 'user-1',
    email: 'guest@labelstudio.com',
    initials: 'GU',
    color: '#6B7280',
    role: 'admin',
    name: 'Guest User',
  },
];

// ── Workspaces ─────────────────────────────────────────────────────────────────
// Start with empty workspaces - users create their own
export const seedWorkspaces: Workspace[] = [];

// ── Projects ───────────────────────────────────────────────────────────────────
// Start with empty projects - users create their own
export const seedProjects: Project[] = [];

// ── Tasks ──────────────────────────────────────────────────────────────────────
// Start with empty tasks - users import their own data
export const seedTasks: Task[] = [];

// ── Annotations ────────────────────────────────────────────────────────────────
// Start with empty annotations
export const seedAnnotations: Annotation[] = [];

// ── Project Stats ──────────────────────────────────────────────────────────────
// Start with empty stats
export const projectStats: Record<
  string,
  {
    totalTasks: number;
    completedTasks: number;
    pendingReview: number;
    predictions: number;
    predictionsCount: number;
    reviewedCount: number;
    starredCount: number;
    skippedCount: number;
  }
> = {};

import React, { createContext, useContext, useReducer, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { User, Workspace, Project, Task, Annotation, TabView } from '../types';
import {
  seedUsers,
  seedWorkspaces,
  seedProjects,
  seedTasks,
  seedAnnotations,
  projectStats as seedProjectStats,
} from '../data/seed';
import { useSession } from '@/lib/auth';
import { api } from '@/lib/api';

// ── User helpers ───────────────────────────────────────────────────────────────

function computeInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
];

function computeColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return COLORS[hash % COLORS.length];
}

function mapRole(role: string): User['role'] {
  if (role === 'REVIEWER') return 'reviewer';
  if (role === 'MANAGER' || role === 'ADMINISTRATOR' || role === 'OWNER') return 'admin';
  return 'annotator';
}

interface BackendUser { id: string; name: string; email: string; role: string; }

function mapBackendUser(u: BackendUser): User {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    initials: computeInitials(u.name),
    color: computeColor(u.id),
    role: mapRole(u.role),
  };
}

// ── State Interface ────────────────────────────────────────────────────────────

interface AppState {
  currentUser: User;
  users: User[];
  workspaces: Workspace[];
  projects: Project[];
  tasks: Task[];
  annotations: Annotation[];
  tabViews: TabView[];
  projectStats: typeof seedProjectStats;
}

// ── Action Types ───────────────────────────────────────────────────────────────

type AppAction =
  | { type: 'ADD_PROJECT'; payload: Project }
  | { type: 'UPDATE_PROJECT'; payload: Project }
  | { type: 'DELETE_PROJECT'; payload: string }
  | { type: 'ADD_WORKSPACE'; payload: Workspace }
  | { type: 'UPDATE_WORKSPACE'; payload: Workspace }
  | { type: 'TOGGLE_ARCHIVE_WORKSPACE'; payload: string }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'ADD_TASKS'; payload: Task[] }
  | { type: 'UPDATE_TASK'; payload: Task }
  | { type: 'TOGGLE_STAR_TASK'; payload: string }
  | { type: 'ADD_ANNOTATION'; payload: Annotation }
  | { type: 'UPDATE_ANNOTATION'; payload: Annotation }
  | { type: 'ADD_TAB_VIEW'; payload: TabView }
  | { type: 'LOAD_STATE'; payload: AppState }
  | { type: 'UPDATE_PROJECT_STATS'; payload: { projectId: string; stats: Partial<typeof seedProjectStats[string]> } };

// ── Reducer ────────────────────────────────────────────────────────────────────

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'ADD_PROJECT':
      return { ...state, projects: [...state.projects, action.payload] };

    case 'UPDATE_PROJECT':
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.id === action.payload.id ? action.payload : p,
        ),
      };

    case 'DELETE_PROJECT':
      return {
        ...state,
        projects: state.projects.filter((p) => p.id !== action.payload),
        tasks: state.tasks.filter((t) => t.projectId !== action.payload),
        annotations: state.annotations.filter((a) => {
          const taskIds = new Set(
            state.tasks
              .filter((t) => t.projectId === action.payload)
              .map((t) => t.id),
          );
          return !taskIds.has(a.taskId);
        }),
      };

    case 'ADD_WORKSPACE':
      return { ...state, workspaces: [...state.workspaces, action.payload] };

    case 'UPDATE_WORKSPACE':
      return {
        ...state,
        workspaces: state.workspaces.map((w) =>
          w.id === action.payload.id ? action.payload : w,
        ),
      };

    case 'TOGGLE_ARCHIVE_WORKSPACE':
      return {
        ...state,
        workspaces: state.workspaces.map((w) =>
          w.id === action.payload ? { ...w, isArchived: !w.isArchived } : w,
        ),
      };

    case 'ADD_TASK':
      return { ...state, tasks: [...state.tasks, action.payload] };

    case 'ADD_TASKS':
      return { ...state, tasks: [...state.tasks, ...action.payload] };

    case 'UPDATE_TASK':
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.payload.id ? action.payload : t,
        ),
      };

    case 'TOGGLE_STAR_TASK':
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.payload ? { ...t, isStarred: !t.isStarred } : t,
        ),
      };

    case 'ADD_ANNOTATION':
      return {
        ...state,
        annotations: [...state.annotations, action.payload],
      };

    case 'UPDATE_ANNOTATION':
      return {
        ...state,
        annotations: state.annotations.map((a) =>
          a.id === action.payload.id ? action.payload : a,
        ),
      };

    case 'ADD_TAB_VIEW':
      return { ...state, tabViews: [...state.tabViews, action.payload] };

    case 'LOAD_STATE':
      return action.payload;

    default:
      return state;
  }
}

// ── localStorage Persistence ───────────────────────────────────────────────────

const STORAGE_KEY = 'label-studio-state';
const STORAGE_VERSION = 'v2'; // Increment to force fresh start

function loadState(): AppState | null {
  try {
    // Check if we should reset state (version changed)
    const storedVersion = localStorage.getItem(`${STORAGE_KEY}-version`);
    if (storedVersion !== STORAGE_VERSION) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(`${STORAGE_KEY}-version`, STORAGE_VERSION);
      return null;
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppState;
    // Basic validation: check that key arrays exist
    if (
      parsed.users &&
      parsed.workspaces &&
      parsed.projects &&
      parsed.tasks &&
      parsed.annotations
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage might be full or unavailable; silently fail
  }
}

// ── Initial State ──────────────────────────────────────────────────────────────

function getInitialState(): AppState {
  const persisted = loadState();
  if (persisted) return persisted;

  return {
    currentUser: seedUsers[0],
    users: seedUsers,
    workspaces: seedWorkspaces,
    projects: seedProjects,
    tasks: seedTasks,
    annotations: seedAnnotations,
    tabViews: [],
    projectStats: seedProjectStats,
  };
}

// ── Context ────────────────────────────────────────────────────────────────────

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

// ── Provider ───────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, null, getInitialState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state, dispatch]);

  return React.createElement(AppContext.Provider, { value }, children);
}

// ── Base Hook ──────────────────────────────────────────────────────────────────

export function useAppStore() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppStore must be used within an AppProvider');
  }
  return context;
}

// ── Selector Hooks ─────────────────────────────────────────────────────────────

export function useCurrentUser(): User {
  const { data: session } = useSession();
  if (session?.user) {
    const u = session.user as any;
    return mapBackendUser({ id: u.id, name: u.name ?? u.email, email: u.email, role: u.role ?? 'ANNOTATOR' });
  }
  // No session — RequireAuth should have redirected before this point
  return { id: '', name: '', email: '', initials: '', color: '#ccc', role: 'annotator' };
}

export function useWorkspaces(): Workspace[] {
  const { state } = useAppStore();
  return state.workspaces;
}

export function useProjects(workspaceId?: string): Project[] {
  const { state } = useAppStore();
  if (workspaceId) {
    return state.projects.filter((p) => p.workspaceId === workspaceId);
  }
  return state.projects;
}

export function useProject(projectId: string): Project | undefined {
  const { state } = useAppStore();
  return state.projects.find((p) => p.id === projectId);
}

export function useTasks(projectId: string): Task[] {
  const { state } = useAppStore();
  return state.tasks.filter((t) => t.projectId === projectId);
}

export function useTask(taskId: string): Task | undefined {
  const { state } = useAppStore();
  return state.tasks.find((t) => t.id === taskId);
}

export function useAnnotations(taskId?: string): Annotation[] {
  const { state } = useAppStore();
  if (taskId) {
    return state.annotations.filter((a) => a.taskId === taskId);
  }
  return state.annotations;
}

export function useProjectStats(
  projectId: string,
): (typeof seedProjectStats)[string] | undefined {
  const { state } = useAppStore();
  return state.projectStats[projectId];
}

export function useUsers(): User[] {
  const { data } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<BackendUser[]>('/api/users'),
  });
  return data ? data.map(mapBackendUser) : [];
}

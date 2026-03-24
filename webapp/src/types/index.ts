export interface User {
  id: string;
  email: string;
  initials: string;
  color: string;
  role: 'admin' | 'annotator' | 'reviewer';
  name: string;
}

export interface Workspace {
  id: string;
  name: string;
  color: string;
  description: string;
  createdAt: string;
  isArchived: boolean;
}

export interface ProjectSettings {
  annotation: Record<string, unknown>;
  review: Record<string, unknown>;
  quality: Record<string, unknown>;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  workspaceId: string;
  color: string;
  labelConfig: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  settings: ProjectSettings;
}

export interface TaskData {
  html?: string;
  search_query?: string;
  classification?: string;
  entity?: string;
  [key: string]: unknown;
}

export interface Task {
  id: string;
  projectId: string;
  data: TaskData;
  status?: string;
  annotationLabel?: string | null;
  completedCount: number;
  cancelledCount: number;
  predictionsCount: number;
  isStarred: boolean;
  createdAt: string;
}

export interface AnnotationResult {
  id: string;
  type: string;
  from_name: string;
  to_name: string;
  value: { choices?: string[]; text?: string };
}

export interface Annotation {
  id: string;
  taskId: string;
  userId: string;
  result: AnnotationResult[];
  comment?: string;
  createdAt: string;
  updatedAt: string;
  status: 'submitted' | 'draft' | 'skipped';
}

export interface TabView {
  id: string;
  name: string;
  projectId: string;
  filters: Record<string, unknown>;
  sort: Record<string, unknown>;
}

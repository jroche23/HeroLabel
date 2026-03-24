import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/Spinner';

// ── Local types (mirrors backend/src/types.ts) ─────────────────────────────

interface LabelingTemplate {
  id: string;
  name: string;
  type: string;
}

interface DataImport {
  id: string;
  fileName: string | null;
  sourceType: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
}

interface ProjectDetail {
  id: string;
  title: string;
  description: string | null;
  workspace: string | null;
  createdAt: string;
  labelingTemplates: LabelingTemplate[];
  dataImports: DataImport[];
}

interface PaginatedTasks {
  tasks: unknown[];
  columns: unknown[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

const TEMPLATE_LABELS: Record<string, string> = {
  image_captioning: 'Image Captioning',
  image_classification: 'Image Classification',
  object_detection: 'Object Detection',
  text_classification: 'Text Classification',
  named_entity_recognition: 'Named Entity Recognition',
  audio_classification: 'Audio Classification',
  video_classification: 'Video Classification',
  custom: 'Custom',
};

function importStatusVariant(status: DataImport['status']): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'completed': return 'default';
    case 'processing': return 'secondary';
    case 'failed': return 'destructive';
    default: return 'outline';
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ── Stat Card ──────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-foreground tabular-nums">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────

export default function ProjectDashboard() {
  const { projectId } = useParams<{ projectId: string }>();

  const { data: project, isLoading, isError } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.get<ProjectDetail>(`/api/projects/${projectId}`),
    enabled: !!projectId,
  });

  const { data: allTasksData } = useQuery({
    queryKey: ['tasks', projectId, 'all'],
    queryFn: () => api.get<PaginatedTasks>(`/api/projects/${projectId}/tasks?pageSize=1`),
    enabled: !!projectId,
  });

  const { data: completedData } = useQuery({
    queryKey: ['tasks', projectId, 'completed'],
    queryFn: () => api.get<PaginatedTasks>(`/api/projects/${projectId}/tasks?status=completed&pageSize=1`),
    enabled: !!projectId,
  });

  const { data: inProgressData } = useQuery({
    queryKey: ['tasks', projectId, 'in_progress'],
    queryFn: () => api.get<PaginatedTasks>(`/api/projects/${projectId}/tasks?status=in_progress&pageSize=1`),
    enabled: !!projectId,
  });

  // ── Loading ──────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size={32} />
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Project not found or you don't have access.</p>
      </div>
    );
  }

  // ── Derived stats ────────────────────────────────────────────────────────

  const total = allTasksData?.pagination.total ?? 0;
  const completed = completedData?.pagination.total ?? 0;
  const inProgress = inProgressData?.pagination.total ?? 0;
  const pending = Math.max(0, total - completed - inProgress);
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  const recentImports = [...(project.dataImports ?? [])]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6 max-w-5xl">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{project.title}</h1>
          {project.description && (
            <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <Button asChild variant="outline" size="sm">
            <Link to={`/projects/${projectId}/data`}>Data Manager</Link>
          </Button>
          <Button asChild size="sm">
            <Link to={`/projects/${projectId}/label`}>Start Labeling</Link>
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Tasks" value={total} />
        <StatCard label="Completed" value={completed} sub={total > 0 ? `${percentage}% of total` : undefined} />
        <StatCard label="In Progress" value={inProgress} />
        <StatCard label="Pending" value={pending} />
      </div>

      {/* Progress */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Annotation Progress</p>
          <p className="text-sm text-muted-foreground">{percentage}% complete</p>
        </div>
        <Progress value={percentage} className="h-2" />
        <p className="text-xs text-muted-foreground">
          {completed} of {total} tasks completed
        </p>
      </div>

      {/* Bottom two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Project Info */}
        <div className="rounded-lg border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-medium text-foreground">Project Info</h2>

          <dl className="space-y-2 text-sm">
            {project.workspace && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Workspace</dt>
                <dd className="text-foreground">{project.workspace}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Created</dt>
              <dd className="text-foreground">{formatDate(project.createdAt)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Templates</dt>
              <dd className="text-foreground">{project.labelingTemplates?.length ?? 0}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Data Imports</dt>
              <dd className="text-foreground">{project.dataImports?.length ?? 0}</dd>
            </div>
          </dl>

          {/* Labeling Templates */}
          {project.labelingTemplates?.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Labeling Templates</p>
              <ul className="space-y-1">
                {project.labelingTemplates.map((t) => (
                  <li key={t.id} className="flex items-center gap-2 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    <span className="text-foreground">{t.name}</span>
                    <Badge variant="outline" className="ml-auto text-xs shrink-0">
                      {TEMPLATE_LABELS[t.type] ?? t.type}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Recent Imports */}
        <div className="rounded-lg border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">Recent Data Imports</h2>
          </div>

          {recentImports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-muted-foreground">No data imported yet.</p>
              <Button asChild variant="outline" size="sm" className="mt-3">
                <Link to={`/projects/${projectId}/data`}>Upload Data</Link>
              </Button>
            </div>
          ) : (
            <ul className="space-y-3">
              {recentImports.map((imp) => (
                <li key={imp.id} className="flex items-center gap-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground truncate">
                      {imp.fileName ?? (imp.sourceType === 'url' ? 'URL import' : 'Import')}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(imp.createdAt)}</p>
                  </div>
                  <Badge variant={importStatusVariant(imp.status)} className="shrink-0 capitalize">
                    {imp.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

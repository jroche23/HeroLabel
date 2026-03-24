import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import {
  Search,
  LayoutGrid,
  List,
  Plus,
  LayoutList,
  MoreHorizontal,
  Settings,
  Trash2,
  Tag,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/Spinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CreateProjectModal } from './CreateProjectModal';
import type { Project } from '@/types';

// Project colors matching Label Studio
const PROJECT_COLORS = [
  '#6B7280', // gray (default/check)
  '#EF4444', // red
  '#F97316', // orange
  '#EAB308', // yellow
  '#22C55E', // green
  '#14B8A6', // teal
  '#3B82F6', // blue
  '#A855F7', // purple
];

type SortField = 'createdAt' | 'updatedAt' | 'name';
type ViewMode = 'grid' | 'list';

interface ProjectGridProps {
  workspaceId: string | null;
}

// Backend project shape returned by GET /api/projects
interface BackendProject {
  id: string;
  title: string;
  description: string | null;
  workspace: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

/** Adapt a backend project to the local Project type used by the card components */
function adaptProject(p: BackendProject): Project {
  return {
    id: p.id,
    name: p.title,
    description: p.description ?? '',
    workspaceId: p.workspace ?? '',   // workspace is a name string in the backend
    color: '#6B7280',
    labelConfig: '',
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    createdBy: p.userId,
    settings: { annotation: {}, review: {}, quality: {} },
  };
}

export function ProjectGrid({ workspaceId }: ProjectGridProps) {
  const { data: backendProjects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get<BackendProject[]>('/api/projects'),
  });

  const allProjects = useMemo(
    () => (backendProjects ?? []).map(adaptProject),
    [backendProjects],
  );

  const [search, setSearch] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [createOpen, setCreateOpen] = useState<boolean>(false);

  const filtered = useMemo(() => {
    let result = workspaceId
      ? allProjects.filter((p) => p.workspaceId === workspaceId)
      : allProjects;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q));
    }

    result = [...result].sort((a, b) => {
      if (sortField === 'name') return a.name.localeCompare(b.name);
      if (sortField === 'createdAt')
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return result;
  }, [allProjects, workspaceId, search, sortField]);

  // workspace name: backend stores it as a plain string in project.workspaceId (after adaptation)
  function getWorkspaceName(wsId: string): string {
    return wsId || '';
  }

  function getAssignedUsers(_project: Project) {
    return [];
  }

  function formatTimeAgo(dateStr: string): string {
    const now = new Date();
    const then = new Date(dateStr);
    const diffMs = now.getTime() - then.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Updated today';
    if (days === 1) return 'Updated 1 day ago';
    if (days < 30) return `Updated ${days} days ago`;
    const months = Math.floor(days / 30);
    if (months === 1) return 'Updated 1 month ago';
    return `Updated ${months} months ago`;
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-6 py-4 border-b border-border bg-card">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updatedAt">Updated At</SelectItem>
              <SelectItem value="createdAt">Created At</SelectItem>
              <SelectItem value="name">Name</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center border border-border rounded-md">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={cn(
                'flex items-center justify-center h-9 w-9 transition-colors',
                viewMode === 'grid'
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={cn(
                'flex items-center justify-center h-9 w-9 transition-colors',
                viewMode === 'list'
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground h-9"
          >
            <Plus className="h-4 w-4 mr-1" />
            Create Project
          </Button>
        </div>
      </div>

      {/* Project Cards */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <LayoutList className="h-12 w-12 mb-4 text-muted-foreground/40" />
            {allProjects.length === 0 ? (
              <>
                <h3 className="text-lg font-medium text-foreground mb-1">No projects yet</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-md">
                  Create your first project to start labeling data. Projects help you organize tasks and collaborate with your team.
                </p>
                <Button
                  onClick={() => setCreateOpen(true)}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Project
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No projects match your search</p>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                workspaceName={getWorkspaceName(project.workspaceId)}
                assignedUsers={getAssignedUsers(project)}
                timeAgo={formatTimeAgo(project.updatedAt)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((project) => (
              <ProjectListRow
                key={project.id}
                project={project}
                workspaceName={getWorkspaceName(project.workspaceId)}
                assignedUsers={getAssignedUsers(project)}
                timeAgo={formatTimeAgo(project.updatedAt)}
              />
            ))}
          </div>
        )}
      </div>

      <CreateProjectModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultWorkspaceId={workspaceId}
      />
    </div>
  );
}

// ── Project Card ──────────────────────────────────────────────────────────────

interface ProjectCardProps {
  project: Project;
  workspaceName: string;
  assignedUsers: { id: string; initials: string; color: string }[];
  timeAgo: string;
}

function ProjectCard({ project, workspaceName, assignedUsers, timeAgo }: ProjectCardProps) {
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [projectColor, setProjectColor] = useState(project.color);

  const canEdit = currentUser.role === 'admin' || currentUser.role === 'reviewer';
  const canDelete = currentUser.role === 'admin';

  const handleColorChange = (color: string) => {
    setProjectColor(color);
  };

  const handleDuplicate = () => {
    // Not implemented for backend projects
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/api/projects/${project.id}`);
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: 'Project deleted', description: `"${project.name}" has been deleted.` });
      setDeleteDialogOpen(false);
      navigate('/projects');
    } catch {
      toast({ title: 'Error', description: 'Could not delete project. Please try again.', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Link
        to={`/projects/${project.id}/data`}
        className="group flex flex-col bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
      >
        {/* Header */}
        <div className="flex items-start gap-2 mb-2">
          <div
            className="mt-1 h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: projectColor }}
          />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium text-foreground truncate group-hover:text-orange-600 transition-colors">
              {project.name}
            </h3>
            {workspaceName && (
              <span className="text-xs text-muted-foreground truncate">
                {workspaceName}
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        {project.description ? (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
            {project.description}
          </p>
        ) : (
          <div className="mb-3" />
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-border">
          <div />
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">{timeAgo}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-accent transition-all"
                >
                  <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48" onClick={(e) => e.stopPropagation()}>
                {/* Color Picker */}
                <div className="flex items-center gap-1 px-2 py-1.5">
                  {PROJECT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        handleColorChange(color);
                      }}
                      className={cn(
                        'h-5 w-5 rounded-full flex items-center justify-center transition-transform hover:scale-110',
                      )}
                      style={{ backgroundColor: color }}
                    >
                      {projectColor === color && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </button>
                  ))}
                </div>
                <DropdownMenuSeparator />
                {canEdit && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(`/projects/${project.id}/settings`);
                    }}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(`/projects/${project.id}/label`);
                  }}
                >
                  <Tag className="h-4 w-4 mr-2" />
                  Label
                </DropdownMenuItem>
                {canDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={(e) => {
                        e.preventDefault();
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete project
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </Link>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => { if (!deleting) setDeleteDialogOpen(open); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{project.name}" and all its tasks, annotations, and data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── Project List Row ──────────────────────────────────────────────────────────

function ProjectListRow({ project, workspaceName, assignedUsers, timeAgo }: ProjectCardProps) {
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [projectColor, setProjectColor] = useState(project.color);

  const canEdit = currentUser.role === 'admin' || currentUser.role === 'reviewer';
  const canDelete = currentUser.role === 'admin';

  const handleColorChange = (color: string) => {
    setProjectColor(color);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/api/projects/${project.id}`);
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: 'Project deleted', description: `"${project.name}" has been deleted.` });
      setDeleteDialogOpen(false);
      navigate('/projects');
    } catch {
      toast({ title: 'Error', description: 'Could not delete project. Please try again.', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Link
        to={`/projects/${project.id}/data`}
        className="group flex items-center gap-4 bg-card border border-border rounded-lg px-4 py-3 hover:shadow-md transition-shadow"
      >
        <div
          className="h-2 w-2 rounded-full shrink-0"
          style={{ backgroundColor: projectColor }}
        />

        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium text-foreground truncate group-hover:text-orange-600 transition-colors">
            {project.name}
          </h3>
          {workspaceName && (
            <span className="text-xs text-muted-foreground">{workspaceName}</span>
          )}
        </div>

        <span className="text-[11px] text-muted-foreground hidden lg:block whitespace-nowrap">
          {timeAgo}
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-accent transition-all"
            >
              <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48" onClick={(e) => e.stopPropagation()}>
            {/* Color Picker */}
            <div className="flex items-center gap-1 px-2 py-1.5">
              {PROJECT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleColorChange(color);
                  }}
                  className={cn(
                    'h-5 w-5 rounded-full flex items-center justify-center transition-transform hover:scale-110',
                  )}
                  style={{ backgroundColor: color }}
                >
                  {projectColor === color && (
                    <Check className="h-3 w-3 text-white" />
                  )}
                </button>
              ))}
            </div>
            <DropdownMenuSeparator />
            {canEdit && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  navigate(`/projects/${project.id}/settings`);
                }}
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                navigate(`/projects/${project.id}/label`);
              }}
            >
              <Tag className="h-4 w-4 mr-2" />
              Label
            </DropdownMenuItem>
            {canDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={(e) => {
                    e.preventDefault();
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete project
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </Link>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => { if (!deleting) setDeleteDialogOpen(open); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{project.name}" and all its tasks, annotations, and data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}


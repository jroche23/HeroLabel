import { useMemo, useState, useEffect } from 'react';
import { FolderOpen, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/store';
import { UserAvatar } from '@/components/shared/UserAvatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const STORAGE_KEY = 'hs-workspace-names';

function loadStoredWorkspaces(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveStoredWorkspaces(names: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(names));
  } catch {
    // ignore
  }
}

interface BackendProject {
  id: string;
  workspace: string | null;
}

interface WorkspaceSidebarProps {
  selectedWorkspace: string | null;
  onSelectWorkspace: (name: string | null) => void;
}

export function WorkspaceSidebar({
  selectedWorkspace,
  onSelectWorkspace,
}: WorkspaceSidebarProps) {
  const currentUser = useCurrentUser();
  const queryClient = useQueryClient();

  const [storedWorkspaces, setStoredWorkspaces] = useState<string[]>(loadStoredWorkspaces);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get<BackendProject[]>('/api/projects'),
  });

  // Derive unique workspace names from backend projects
  const projectWorkspaces = useMemo(() => {
    const names = new Set<string>();
    projects.forEach((p) => { if (p.workspace) names.add(p.workspace); });
    return names;
  }, [projects]);

  // Merge stored + project-derived workspaces
  const allWorkspaceNames = useMemo(() => {
    const merged = new Set([...storedWorkspaces, ...projectWorkspaces]);
    return Array.from(merged).sort();
  }, [storedWorkspaces, projectWorkspaces]);

  // Sync stored workspaces to localStorage whenever they change
  useEffect(() => {
    saveStoredWorkspaces(storedWorkspaces);
  }, [storedWorkspaces]);

  function handleCreate() {
    const name = newName.trim();
    if (!name || storedWorkspaces.includes(name)) return;
    setStoredWorkspaces((prev) => [...prev, name]);
    setNewName('');
    setCreateOpen(false);
  }

  async function handleDelete(name: string) {
    // Remove from stored list
    setStoredWorkspaces((prev) => prev.filter((n) => n !== name));

    // If any projects use this workspace, clear their workspace field via API
    const affectedProjects = projects.filter((p) => p.workspace === name);
    if (affectedProjects.length > 0) {
      await Promise.allSettled(
        affectedProjects.map((p) =>
          api.put(`/api/projects/${p.id}`, { workspace: null })
        )
      );
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    }

    // Deselect if this workspace was selected
    if (selectedWorkspace === name) {
      onSelectWorkspace(null);
    }

    setDeleteTarget(null);
  }

  return (
    <div className="flex flex-col h-full py-3 text-sm">
      {/* All Projects */}
      <button
        type="button"
        onClick={() => onSelectWorkspace(null)}
        className={cn(
          'flex items-center gap-2.5 px-4 py-2 mx-2 rounded-md transition-colors hover:bg-accent/50',
          selectedWorkspace === null && 'bg-accent/60',
        )}
      >
        <UserAvatar initials={currentUser.initials} color={currentUser.color} size="sm" />
        <span className="text-sm font-medium text-foreground truncate">All Projects</span>
      </button>

      {/* Divider */}
      <div className="mx-4 my-3 h-px bg-border" />

      {/* Workspaces header */}
      <div className="flex items-center justify-between px-4 mb-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Workspaces
        </span>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          title="Create workspace"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Workspace list */}
      <div className="flex-1 overflow-y-auto px-1">
        {allWorkspaceNames.length === 0 ? (
          <div className="px-4 py-4 text-center">
            <FolderOpen className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">No workspaces yet</p>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="text-xs text-primary hover:underline mt-1"
            >
              Create one
            </button>
          </div>
        ) : (
          allWorkspaceNames.map((name) => {
            const isActive = selectedWorkspace === name;
            return (
              <div key={name} className="group flex items-center mx-1">
                <button
                  type="button"
                  onClick={() => onSelectWorkspace(name)}
                  className={cn(
                    'flex flex-1 items-center gap-2.5 px-3 py-1.5 rounded-md text-left transition-colors hover:bg-accent/50',
                    isActive && 'bg-accent/60 border-l-2 border-l-orange-500 pl-[10px]',
                  )}
                >
                  <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className={cn(
                    'text-sm truncate',
                    isActive ? 'text-foreground font-medium' : 'text-muted-foreground',
                  )}>
                    {name}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(name)}
                  className="opacity-0 group-hover:opacity-100 mr-1 p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                  title={`Delete "${name}"`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Create Workspace Dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); setNewName(''); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Create Workspace</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium text-foreground">Workspace name</label>
            <Input
              className="mt-1.5"
              placeholder="e.g. Research Team"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete workspace?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the <strong>{deleteTarget}</strong> workspace.
              {projects.some((p) => p.workspace === deleteTarget)
                ? ' Projects currently in this workspace will be moved to no workspace.'
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

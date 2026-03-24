import { useState } from 'react';
import { Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useWorkspaces, useAppStore } from '@/store';
import type { Project } from '@/types';

const PROJECT_COLORS = [
  '#FFFFFF',
  '#EF4444',
  '#F97316',
  '#EAB308',
  '#22C55E',
  '#14B8A6',
  '#3B82F6',
  '#EC4899',
];

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultWorkspaceId?: string | null;
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  defaultWorkspaceId,
}: CreateProjectDialogProps) {
  const workspaces = useWorkspaces().filter((w) => !w.isArchived);
  const { dispatch } = useAppStore();

  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [workspaceId, setWorkspaceId] = useState<string>(defaultWorkspaceId ?? workspaces[0]?.id ?? '');
  const [color, setColor] = useState<string>(PROJECT_COLORS[6]);

  function resetForm() {
    setName('');
    setDescription('');
    setWorkspaceId(defaultWorkspaceId ?? workspaces[0]?.id ?? '');
    setColor(PROJECT_COLORS[6]);
  }

  function handleCreate() {
    if (!name.trim() || !workspaceId) return;

    const now = new Date().toISOString();
    const newProject: Project = {
      id: `p-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      workspaceId,
      color,
      labelConfig: '',
      createdAt: now,
      updatedAt: now,
      createdBy: 'user-1',
      settings: { annotation: {}, review: {}, quality: {} },
    };

    dispatch({ type: 'ADD_PROJECT', payload: newProject });
    resetForm();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Project</DialogTitle>
          <DialogDescription>
            Add a new annotation project to your workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Project Name
            </label>
            <Input
              placeholder="e.g. Vendor Relevance Evaluation"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Description
            </label>
            <Textarea
              placeholder="Brief description of the project..."
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Workspace
            </label>
            <Select value={workspaceId} onValueChange={setWorkspaceId}>
              <SelectTrigger>
                <SelectValue placeholder="Select workspace" />
              </SelectTrigger>
              <SelectContent>
                {workspaces.map((ws) => (
                  <SelectItem key={ws.id} value={ws.id}>
                    {ws.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Color</label>
            <div className="flex items-center gap-2">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="relative h-7 w-7 rounded-full border border-border transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                >
                  {color === c ? (
                    <Check
                      className="absolute inset-0 m-auto h-3.5 w-3.5"
                      style={{ color: c === '#FFFFFF' ? '#6B7280' : '#FFFFFF' }}
                    />
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';

const STORAGE_KEY = 'hs-workspace-names';

function loadStoredWorkspaces(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

interface BackendProject {
  id: string;
  workspace: string | null;
}

interface ProjectFormData {
  workspaceId: string;
  name: string;
  description: string;
  importFiles: File[];
  importUrls: string[];
  labelConfig: string;
  templateId?: string;
}

interface ProjectGeneralTabProps {
  formData: ProjectFormData;
  updateFormData: (updates: Partial<ProjectFormData>) => void;
  defaultWorkspaceId?: string | null;
}

export function ProjectGeneralTab({
  formData,
  updateFormData,
}: ProjectGeneralTabProps) {
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get<BackendProject[]>('/api/projects'),
  });

  const workspaceOptions = useMemo(() => {
    const fromProjects = projects
      .map((p) => p.workspace)
      .filter((w): w is string => !!w);
    const fromStorage = loadStoredWorkspaces();
    const merged = new Set([...fromStorage, ...fromProjects]);
    return Array.from(merged).sort();
  }, [projects]);

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Project Information</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Set up the basic details for your annotation project.
          </p>
        </div>

        <div className="space-y-4">
          {/* Project Title */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Project Title <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="e.g. Image Classification for Product Catalog"
              value={formData.name}
              onChange={(e) => updateFormData({ name: e.target.value })}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              A clear, descriptive name for your labeling project
            </p>
          </div>

          {/* Workspace (optional) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Workspace
            </label>
            {workspaceOptions.length > 0 ? (
              <Select
                value={formData.workspaceId || '__none__'}
                onValueChange={(val) =>
                  updateFormData({ workspaceId: val === '__none__' ? '' : val })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="No workspace" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No workspace</SelectItem>
                  {workspaceOptions.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                placeholder="e.g. Research Team"
                value={formData.workspaceId}
                onChange={(e) => updateFormData({ workspaceId: e.target.value })}
                className="w-full"
              />
            )}
            <p className="text-xs text-muted-foreground">
              Optional: Group this project under a workspace
            </p>
          </div>

          {/* Project Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Project Description
            </label>
            <Textarea
              placeholder="Describe the purpose of this project, labeling guidelines, or any important notes..."
              value={formData.description}
              onChange={(e) => updateFormData({ description: e.target.value })}
              rows={6}
              className="w-full resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Optional: Add context to help annotators understand the project goals
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

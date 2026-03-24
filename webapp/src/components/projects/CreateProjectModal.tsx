import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProjectGeneralTab } from './ProjectGeneralTab';
import { DataImportTab } from './DataImportTab';
import { LabelingSetupTab } from './LabelingSetupTab';
import { api } from '@/lib/api';

interface CreateProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultWorkspaceId?: string | null;
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

interface BackendProject {
  id: string;
  title: string;
  workspace: string | null;
}

function extractLabelsFromXML(xml: string): string[] {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    const choices: string[] = [];
    doc.querySelectorAll('Choice').forEach((c) => {
      const v = c.getAttribute('value');
      if (v) choices.push(v);
    });
    return choices;
  } catch {
    return [];
  }
}

const EMPTY_FORM: ProjectFormData = {
  workspaceId: '',
  name: '',
  description: '',
  importFiles: [],
  importUrls: [],
  labelConfig: '',
  templateId: undefined,
};

export function CreateProjectModal({
  open,
  onOpenChange,
  defaultWorkspaceId,
}: CreateProjectModalProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>('general');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProjectFormData>({
    ...EMPTY_FORM,
    workspaceId: defaultWorkspaceId ?? '',
  });

  function updateFormData(updates: Partial<ProjectFormData>) {
    setFormData((prev) => ({ ...prev, ...updates }));
  }

  function handleDiscard() {
    setFormData({ ...EMPTY_FORM, workspaceId: defaultWorkspaceId ?? '' });
    setActiveTab('general');
    setError(null);
    onOpenChange(false);
  }

  function handleContinue() {
    if (activeTab === 'general') {
      setActiveTab('import');
    } else if (activeTab === 'import') {
      setActiveTab('labeling');
    }
  }

  async function handleSaveAndOpen() {
    if (!formData.name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Create project in backend
      const newProject = await api.post<BackendProject>('/api/projects', {
        title: formData.name.trim(),
        description: formData.description.trim() || undefined,
        workspace: formData.workspaceId.trim() || undefined,
      });

      const projectId = newProject.id;

      // 2. Save labeling template if XML config is provided
      if (formData.labelConfig.trim()) {
        try {
          const labels = extractLabelsFromXML(formData.labelConfig);
          await api.post(`/api/projects/${projectId}/template`, {
            name: formData.name.trim(),
            type: 'custom',
            config: { xml: formData.labelConfig, labels },
          });
        } catch {
          // Template save failure is non-fatal
        }
      }

      // 3. Upload any selected files
      for (const file of formData.importFiles) {
        try {
          const fileContent = await file.text();
          const fileType = file.name.split('.').pop()?.toLowerCase() ?? 'txt';
          await api.post(`/api/projects/${projectId}/upload`, {
            fileContent,
            fileType,
            fileName: file.name,
          });
        } catch {
          // File upload failure is non-fatal
        }
      }

      // 4. Refresh projects list
      await queryClient.invalidateQueries({ queryKey: ['projects'] });

      // 5. Navigate to the new project and close modal
      onOpenChange(false);
      navigate(`/projects/${projectId}/data`);

      setFormData({ ...EMPTY_FORM, workspaceId: defaultWorkspaceId ?? '' });
      setActiveTab('general');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setLoading(false);
    }
  }

  const canContinue =
    activeTab === 'general'
      ? !!formData.name.trim()
      : true;

  const canSave = !!formData.name.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] p-0 gap-0 flex flex-col overflow-hidden" hideCloseButton>
        {/* Header - fixed at top */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <DialogTitle className="text-lg font-semibold">Create Project</DialogTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleDiscard} disabled={loading}>
              Discard
            </Button>
            {activeTab !== 'labeling' ? (
              <Button
                size="sm"
                onClick={handleContinue}
                disabled={!canContinue || loading}
                className="bg-primary hover:bg-primary/90"
              >
                Continue
              </Button>
            ) : null}
            <Button
              size="sm"
              onClick={handleSaveAndOpen}
              disabled={!canSave || loading}
              className="bg-primary hover:bg-primary/90"
            >
              {loading ? 'Creating...' : 'Save & Open'}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleDiscard}
              disabled={loading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive shrink-0">
            {error}
          </div>
        )}

        {/* Tabs - flex container for scrollable content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-full justify-center border-b rounded-none h-12 bg-transparent px-6 shrink-0">
            <TabsTrigger
              value="general"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent"
            >
              Project General
            </TabsTrigger>
            <TabsTrigger
              value="import"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent"
            >
              Data Import
            </TabsTrigger>
            <TabsTrigger
              value="labeling"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent"
            >
              Labeling Setup
            </TabsTrigger>
          </TabsList>

          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <TabsContent value="general" className="mt-0 m-0">
              <ProjectGeneralTab
                formData={formData}
                updateFormData={updateFormData}
                defaultWorkspaceId={defaultWorkspaceId}
              />
            </TabsContent>

            <TabsContent value="import" className="mt-0 m-0">
              <DataImportTab formData={formData} updateFormData={updateFormData} />
            </TabsContent>

            <TabsContent value="labeling" className="mt-0 m-0">
              <LabelingSetupTab formData={formData} updateFormData={updateFormData} />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  SettingsSidebar,
  type SettingsTabId,
} from '@/components/settings/SettingsSidebar';
import { GeneralSettings } from '@/components/settings/GeneralSettings';
import { LabelingInterfaceSettings } from '@/components/settings/LabelingInterfaceSettings';
import { AnnotationSettings, type AnnotationSettingsData } from '@/components/settings/AnnotationSettings';
import { ReviewSettings, type ReviewSettingsData } from '@/components/settings/ReviewSettings';
import { QualitySettings, type QualitySettingsData } from '@/components/settings/QualitySettings';
import { MembersSettings } from '@/components/settings/MembersSettings';
import { DangerZoneSettings } from '@/components/settings/DangerZoneSettings';
import { ComingSoonTab } from '@/components/settings/ComingSoonTab';
import { Spinner } from '@/components/ui/Spinner';

const DEFAULT_QUALITY_SETTINGS: QualitySettingsData = {
  limitTasksPerAnnotator: false,
  taskLimitPerAnnotator: 1,
  agreementMetric: 'basic_matching',
  customWeights: {},
};

const DEFAULT_REVIEW_SETTINGS: ReviewSettingsData = {
  showInstructionsBeforeReviewing: false,
  reviewInstructions: '',
  rejectAction: 'remove_from_queue',
  requireCommentOnReject: false,
  showDataManagerToReviewers: true,
  showUnusedColumnsToReviewers: true,
  showAgreementToReviewers: false,
  reviewedWhen: 'one_accepted',
  showOnlyManuallyAssigned: false,
  showOnlyFinishedTasks: false,
  taskOrdering: 'by_task_id',
  taskLimitPercent: 100,
};

const DEFAULT_ANNOTATION_SETTINGS: AnnotationSettingsData = {
  allowEmptyAnnotations: true,
  showDataManagerToAnnotators: false,
  allowSkipping: true,
  requireCommentToSkip: false,
  skipQueue: 'requeue_same',
  usePredictionsToPreLabel: true,
  revealPreAnnotationsInteractively: false,
  showInstructionsBeforeLabeling: false,
  instructions: '',
  taskAssignment: 'manual',
};

interface BackendProject {
  id: string;
  title: string;
  description: string | null;
  workspace: string | null;
  labelingTemplates?: Array<{
    id: string;
    config: { xml?: string; labels?: string[] };
  }>;
}

const STORAGE_KEY = 'hs-workspace-names';
function loadStoredWorkspaces(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch { return []; }
}

const TAB_LABELS: Record<string, string> = {
  annotation: 'Annotation',
  review: 'Review',
  quality: 'Quality',
  members: 'Members',
  model: 'Model',
  predictions: 'Predictions',
  'cloud-storage': 'Cloud Storage',
  webhooks: 'Webhooks',
  'danger-zone': 'Danger Zone',
};

function TabSpinner() {
  return (
    <div className="flex items-center justify-center p-12">
      <Spinner size={24} />
    </div>
  );
}

export default function ProjectSettings() {
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<SettingsTabId>('general');

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.get<BackendProject>(`/api/projects/${projectId}`),
    enabled: !!projectId,
  });

  const { data: allProjects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get<BackendProject[]>('/api/projects'),
  });

  const { data: annotationSettings, isLoading: annotationLoading } = useQuery({
    queryKey: ['annotation-settings', projectId],
    queryFn: () => api.get<AnnotationSettingsData>(`/api/projects/${projectId}/annotation-settings`),
    enabled: !!projectId,
  });

  const { data: reviewSettings, isLoading: reviewLoading } = useQuery({
    queryKey: ['review-settings', projectId],
    queryFn: () => api.get<ReviewSettingsData>(`/api/projects/${projectId}/review-settings`),
    enabled: !!projectId,
  });

  const { data: qualitySettings, isLoading: qualityLoading } = useQuery({
    queryKey: ['quality-settings', projectId],
    queryFn: () => api.get<QualitySettingsData>(`/api/projects/${projectId}/quality-settings`),
    enabled: !!projectId,
  });

  const workspaceNames = useMemo(() => {
    const fromProjects = allProjects
      .map((p) => p.workspace)
      .filter((w): w is string => !!w);
    const fromStorage = loadStoredWorkspaces();
    return Array.from(new Set([...fromStorage, ...fromProjects])).sort();
  }, [allProjects]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Spinner size={32} />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-sm text-muted-foreground">Project not found.</p>
      </div>
    );
  }

  const labelConfig = project.labelingTemplates?.[0]?.config?.xml ?? '';

  async function handleSaveGeneral(updates: {
    name: string;
    description: string;
    workspace: string | null;
  }) {
    if (!projectId) return;
    await api.put(`/api/projects/${projectId}`, {
      title: updates.name,
      description: updates.description || undefined,
      workspace: updates.workspace || undefined,
    });
    queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    queryClient.invalidateQueries({ queryKey: ['projects'] });
  }

  async function handleSaveLabelConfig(xml: string) {
    if (!projectId) return;
    if (!project.labelingTemplates?.length) {
      await api.post(`/api/projects/${projectId}/template`, {
        name: project.title,
        type: 'custom',
        config: { xml, labels: [] },
      });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    }
  }

  async function handleSaveAnnotationSettings(settings: AnnotationSettingsData) {
    if (!projectId) return;
    await api.put(`/api/projects/${projectId}/annotation-settings`, settings);
    queryClient.invalidateQueries({ queryKey: ['annotation-settings', projectId] });
  }

  async function handleSaveReviewSettings(settings: ReviewSettingsData) {
    if (!projectId) return;
    await api.put(`/api/projects/${projectId}/review-settings`, settings);
    queryClient.invalidateQueries({ queryKey: ['review-settings', projectId] });
  }

  async function handleSaveQualitySettings(settings: QualitySettingsData) {
    if (!projectId) return;
    await api.put(`/api/projects/${projectId}/quality-settings`, settings);
    queryClient.invalidateQueries({ queryKey: ['quality-settings', projectId] });
  }

  function renderContent() {
    switch (activeTab) {
      case 'general':
        return (
          <GeneralSettings
            name={project!.title}
            description={project!.description ?? ''}
            workspace={project!.workspace}
            workspaceNames={workspaceNames}
            onSave={handleSaveGeneral}
          />
        );
      case 'labeling-interface':
        return (
          <LabelingInterfaceSettings
            labelConfig={labelConfig}
            onSave={handleSaveLabelConfig}
          />
        );
      case 'annotation':
        if (annotationLoading) return <TabSpinner />;
        return (
          <AnnotationSettings
            key={`annotation-${projectId}`}
            initialSettings={annotationSettings ?? DEFAULT_ANNOTATION_SETTINGS}
            onSave={handleSaveAnnotationSettings}
          />
        );
      case 'review':
        if (reviewLoading) return <TabSpinner />;
        return (
          <ReviewSettings
            key={`review-${projectId}`}
            initialSettings={reviewSettings ?? DEFAULT_REVIEW_SETTINGS}
            onSave={handleSaveReviewSettings}
          />
        );
      case 'quality':
        if (qualityLoading) return <TabSpinner />;
        return (
          <QualitySettings
            key={`quality-${projectId}`}
            initialSettings={qualitySettings ?? DEFAULT_QUALITY_SETTINGS}
            labelConfigXml={labelConfig}
            onSave={handleSaveQualitySettings}
          />
        );
      case 'members':
        return <MembersSettings projectId={projectId!} />;
      case 'danger-zone':
        return <DangerZoneSettings projectId={projectId!} projectTitle={project!.title} />;
      default:
        return <ComingSoonTab tabName={TAB_LABELS[activeTab] ?? activeTab} />;
    }
  }

  return (
    <div className="flex h-full">
      <aside className="w-[220px] shrink-0 border-r border-border bg-card overflow-y-auto">
        <SettingsSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      </aside>
      <main className="flex-1 overflow-auto">{renderContent()}</main>
    </div>
  );
}

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/store';
import { TaskListPanel } from '@/components/labeling/TaskListPanel';
import { AnnotationPanel } from '@/components/labeling/AnnotationPanel';
import { BottomActionBar } from '@/components/labeling/BottomActionBar';
import { useProjectTabs, type AnnotationSettings } from '@/contexts/ProjectTabContext';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { Spinner } from '@/components/ui/Spinner';
import {
  parseLabelConfig,
  type LabelConfigElement,
  type ParsedLabelConfig,
} from '@/lib/labelConfigParser';
import type { Task, Annotation, AnnotationResult, SpanAnnotation, NerLabelState } from '@/types';

// ── Taxonomy helpers ───────────────────────────────────────────────────────

interface TaxonomyCategory {
  label: string;
  subcases: string[];
}

function parseTaxonomyFromXml(xml: string): TaxonomyCategory[] {
  if (!xml) return [];
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    const taxonomy = doc.querySelector('Taxonomy');
    if (!taxonomy) return [];

    const categories: TaxonomyCategory[] = [];
    for (const topChoice of Array.from(taxonomy.children)) {
      if (topChoice.tagName !== 'Choice') continue;
      const label = topChoice.getAttribute('value') ?? '';
      const subcases: string[] = [];
      for (const sub of Array.from(topChoice.children)) {
        if (sub.tagName === 'Choice') {
          const v = sub.getAttribute('value') ?? '';
          if (v) subcases.push(v);
        }
      }
      categories.push({ label, subcases });
    }
    return categories;
  } catch {
    return [];
  }
}

// ── Backend API types ──────────────────────────────────────────────────────

interface BackendTask {
  id: string;
  projectId: string;
  status: 'pending' | 'in_progress' | 'completed';
  assignedTo: string | null;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface BackendProject {
  id: string;
  title: string;
  description: string | null;
  workspace: string | null;
  createdAt: string;
  labelingTemplates: {
    id: string;
    name: string;
    type: string;
    config: Record<string, unknown>;
  }[];
}

interface BackendPaginatedTasks {
  tasks: BackendTask[];
  columns: unknown[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

interface BackendAnnotation {
  id: string;
  taskId: string;
  userId: string;
  status: string;
  result: string | null;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

type TemplateValues = Record<string, string | string[]>;

const FALLBACK_CHOICES = ['Fully Meets Intent', 'Partially Meets Intent', 'Irrelevant', 'Unknown'];

function extractRelevanceChoices(xml: string): string[] {
  if (!xml) return FALLBACK_CHOICES;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    const choices = doc.querySelector('Choices');
    if (!choices) return FALLBACK_CHOICES;
    const vals = Array.from(choices.querySelectorAll(':scope > Choice'))
      .map((el) => el.getAttribute('value') ?? '')
      .filter(Boolean);
    return vals.length > 0 ? vals : FALLBACK_CHOICES;
  } catch {
    return FALLBACK_CHOICES;
  }
}

function extractChoices(project: BackendProject | undefined): string[] {
  const xml = (project?.labelingTemplates?.[0]?.config as Record<string, unknown>)?.xml as string | undefined;
  if (xml) return extractRelevanceChoices(xml);
  const config = project?.labelingTemplates?.[0]?.config;
  if (config && Array.isArray(config.labels) && config.labels.length > 0) {
    return (config.labels as string[]).slice(0, 4);
  }
  return FALLBACK_CHOICES;
}

function adaptTask(bt: BackendTask, completedIds: Set<string>, groundTruthIds: Set<string>): Task {
  return {
    id: bt.id,
    projectId: bt.projectId,
    data: bt.data as any,
    completedCount: completedIds.has(bt.id) || bt.status === 'completed' ? 1 : 0,
    cancelledCount: 0,
    predictionsCount: 0,
    isStarred: groundTruthIds.has(bt.id),
    createdAt: bt.createdAt,
  };
}

/**
 * Build annotation result array from template form values by walking the XML element tree.
 * Each Choices/TextArea/Taxonomy element with a non-empty value contributes one result item.
 */
function buildResultFromElements(
  elements: LabelConfigElement[],
  values: TemplateValues,
): AnnotationResult[] {
  const result: AnnotationResult[] = [];

  function traverse(el: LabelConfigElement) {
    if (el.type === 'Choices' && el.name) {
      const val = values[el.name];
      if (val !== undefined && val !== '' && !(Array.isArray(val) && val.length === 0)) {
        result.push({
          id: crypto.randomUUID(),
          type: 'choices',
          from_name: el.name,
          to_name: el.toName ?? '',
          value: { choices: Array.isArray(val) ? val : [String(val)] },
        });
      }
    } else if (el.type === 'TextArea' && el.name) {
      const val = values[el.name];
      if (val !== undefined && String(val).trim() !== '') {
        result.push({
          id: crypto.randomUUID(),
          type: 'textarea',
          from_name: el.name,
          to_name: el.toName ?? '',
          value: { text: String(val) },
        });
      }
    } else if (el.type === 'Taxonomy' && el.name) {
      const val = values[el.name];
      if (val !== undefined && !(Array.isArray(val) && val.length === 0) && val !== '') {
        result.push({
          id: crypto.randomUUID(),
          type: 'taxonomy',
          from_name: el.name,
          to_name: el.toName ?? '',
          value: { choices: Array.isArray(val) ? val : [String(val)] },
        });
      }
    }
    el.children?.forEach(traverse);
  }

  elements.forEach(traverse);
  return result;
}

/**
 * Load template values from an existing annotation's result array.
 */
function templateValuesFromResult(result: AnnotationResult[]): TemplateValues {
  const tv: TemplateValues = {};
  for (const r of result) {
    if ((r.type === 'choices' || r.type === 'taxonomy') && r.value.choices) {
      const choices = r.value.choices;
      tv[r.from_name] = choices.length === 1 ? choices[0] : choices;
    } else if (r.type === 'textarea' && r.value.text) {
      tv[r.from_name] = r.value.text;
    }
  }
  return tv;
}

/**
 * Load span annotations from a saved annotation result array.
 */
function spanAnnotationsFromResult(result: AnnotationResult[]): SpanAnnotation[] {
  return result
    .filter((r) => r.type === 'labels' && r.value.start !== undefined && r.value.end !== undefined)
    .map((r) => ({
      id: r.id,
      textName: r.to_name,
      start: r.value.start!,
      end: r.value.end!,
      text: r.value.text ?? '',
      label: r.value.labels?.[0] ?? '',
      color: r.value.color,
    }));
}

/**
 * Build AnnotationResult array for span annotations.
 * nerLinks: textName -> labelsName
 */
function buildSpanResults(
  spans: SpanAnnotation[],
  nerLinks: Map<string, string>,
): AnnotationResult[] {
  return spans.map((span) => ({
    id: crypto.randomUUID(),
    type: 'labels',
    from_name: nerLinks.get(span.textName) ?? span.textName,
    to_name: span.textName,
    value: {
      start: span.start,
      end: span.end,
      text: span.text,
      labels: [span.label],
      color: span.color,
    },
  }));
}

// ── Component ──────────────────────────────────────────────────────────────

export default function LabelingInterface() {
  const { projectId, taskId: urlTaskId } = useParams<{ projectId: string; taskId?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = useCurrentUser();
  const { activeTabId, getTabSettings, updateTabSettings } = useProjectTabs();

  // ── Data fetching ──────────────────────────────────────────────────────

  const { data: backendProject, isLoading: projectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.get<BackendProject>(`/api/projects/${projectId}`),
    enabled: !!projectId,
  });

  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', projectId, 'labeling'],
    queryFn: () =>
      api.get<BackendPaginatedTasks>(`/api/projects/${projectId}/tasks?pageSize=200&forLabeling=true`),
    enabled: !!projectId,
  });

  // If navigating directly to a task that may not be in the 200-task batch, fetch it individually
  const { data: directTask } = useQuery({
    queryKey: ['task', projectId, urlTaskId],
    queryFn: () => api.get<BackendTask>(`/api/projects/${projectId}/tasks/${urlTaskId}`),
    enabled: !!projectId && !!urlTaskId,
  });

  const { data: backendAnnotations } = useQuery({
    queryKey: ['annotations', projectId],
    queryFn: () => api.get<BackendAnnotation[]>(`/api/projects/${projectId}/annotations`),
    enabled: !!projectId,
  });

  // ── Local UI state ─────────────────────────────────────────────────────

  const [currentTaskId, setCurrentTaskId] = useState<string>(urlTaskId ?? '');

  // Simple mode state (used when no XML label config)
  const [choiceHistory, setChoiceHistory] = useState<Array<string | null>>([null]);
  const [choiceHistoryIdx, setChoiceHistoryIdx] = useState<number>(0);
  const selectedChoice = choiceHistory[choiceHistoryIdx] ?? null;

  const [selectedReasoning, setSelectedReasoning] = useState<string | null>(null);
  const [comment, setComment] = useState<string>('');

  // Template mode state (used when XML label config is present)
  const [templateValues, setTemplateValues] = useState<TemplateValues>({});

  // NER (Named Entity Recognition) state
  const [spanAnnotations, setSpanAnnotations] = useState<SpanAnnotation[]>([]);
  const [activeNerLabel, setActiveNerLabel] = useState<NerLabelState | null>(null);

  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [groundTruthIds, setGroundTruthIds] = useState<Set<string>>(new Set());
  const [localAnnotations, setLocalAnnotations] = useState<Annotation[]>([]);

  // Seed localAnnotations + completedIds from backend on first load
  const seededRef = useRef(false);
  const [annotationsSeeded, setAnnotationsSeeded] = useState(false);
  useEffect(() => {
    if (seededRef.current || !backendAnnotations) return;
    seededRef.current = true;

    const mapped: Annotation[] = backendAnnotations.map((a) => {
      let result: Annotation['result'] = [];
      try {
        result = a.result ? JSON.parse(a.result) : [];
      } catch { /* ignore */ }
      return {
        id: a.id,
        taskId: a.taskId,
        userId: a.userId,
        result,
        comment: a.comment ?? undefined,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
        status: 'submitted',
      };
    });

    setLocalAnnotations(mapped);
    setCompletedIds(new Set(backendAnnotations.map((a) => a.taskId)));
    setAnnotationsSeeded(true);
  }, [backendAnnotations]);

  // Per-tab settings
  const settings = getTabSettings(activeTabId);
  const handleChangeSettings = useCallback(
    (patch: Partial<AnnotationSettings>) => updateTabSettings(activeTabId, patch),
    [activeTabId, updateTabSettings],
  );

  // ── Derived data ───────────────────────────────────────────────────────

  const backendTasks = useMemo(() => {
    const list = tasksData?.tasks ?? [];
    // If we fetched a specific task that isn't already in the list, prepend it
    if (directTask && !list.some((t) => t.id === directTask.id)) {
      return [directTask, ...list];
    }
    return list;
  }, [tasksData, directTask]);

  const tasks = useMemo(
    () => backendTasks.map((t) => adaptTask(t, completedIds, groundTruthIds)),
    [backendTasks, completedIds, groundTruthIds],
  );

  // Parse the XML label config once
  const labelConfig = useMemo((): ParsedLabelConfig | null => {
    const xml = (backendProject?.labelingTemplates?.[0]?.config as Record<string, unknown>)?.xml as string | undefined;
    if (!xml) return null;
    return parseLabelConfig(xml);
  }, [backendProject]);

  // NER links: textName -> labelsName (built from parsed label config)
  const nerLinks = useMemo((): Map<string, string> => {
    const map = new Map<string, string>();
    labelConfig?.labels.forEach((l) => map.set(l.toName, l.name));
    return map;
  }, [labelConfig]);

  // In simple mode: choices from config
  const choices = useMemo(() => extractChoices(backendProject), [backendProject]);

  // In simple mode: taxonomy reasoning choices
  const taxonomyCategories = useMemo(() => {
    const xml = (backendProject?.labelingTemplates?.[0]?.config as Record<string, unknown>)?.xml as string | undefined;
    return parseTaxonomyFromXml(xml ?? '');
  }, [backendProject]);

  // Default to first task when tasks load
  useEffect(() => {
    if (!currentTaskId && tasks.length > 0) {
      setCurrentTaskId(tasks[0].id);
    }
  }, [currentTaskId, tasks]);

  const currentTask = useMemo(
    () => tasks.find((t) => t.id === currentTaskId),
    [tasks, currentTaskId],
  );

  const reasoningChoices = useMemo((): string[] => {
    if (taxonomyCategories.length === 0) return [];
    const allSubcases: string[] = [];
    for (const cat of taxonomyCategories) {
      if (cat.label !== 'None of the above') {
        allSubcases.push(...cat.subcases);
      }
    }
    const noneExists = taxonomyCategories.some((c) => c.label === 'None of the above');
    return [...allSubcases, ...(noneExists ? ['None of the above'] : [])];
  }, [taxonomyCategories]);

  const existingAnnotation = useMemo(
    () => localAnnotations.find((a) => a.taskId === currentTaskId),
    [localAnnotations, currentTaskId],
  );

  // Ref so per-task effect reads the latest annotation without stale closure
  const existingAnnotationRef = useRef<Annotation | undefined>(undefined);
  existingAnnotationRef.current = existingAnnotation;

  // Reset per-task state when active task changes OR when backend annotations first load
  useEffect(() => {
    const annotation = existingAnnotationRef.current;

    // Simple mode resets
    const choiceResult = annotation?.result.find((r) => r.type === 'choices');
    const reasoningResult = annotation?.result.find((r) => r.type === 'taxonomy');
    setChoiceHistory([choiceResult?.value?.choices?.[0] ?? null]);
    setChoiceHistoryIdx(0);
    setComment(annotation?.comment ?? '');
    setSelectedReasoning(reasoningResult?.value?.choices?.[0] ?? null);

    // Template mode resets
    if (annotation?.result && annotation.result.length > 0) {
      setTemplateValues(templateValuesFromResult(annotation.result));
      setSpanAnnotations(spanAnnotationsFromResult(annotation.result));
    } else {
      setTemplateValues({});
      setSpanAnnotations([]);
    }
    setActiveNerLabel(null);
  }, [currentTaskId, annotationsSeeded]);

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleSelectTask = useCallback(
    (taskId: string) => {
      setCurrentTaskId(taskId);
      navigate(`/projects/${projectId}/label/${taskId}`, { replace: true });
    },
    [navigate, projectId],
  );

  const getNextTaskId = useCallback((): string | null => {
    const idx = tasks.findIndex((t) => t.id === currentTaskId);
    return idx >= 0 && idx < tasks.length - 1 ? tasks[idx + 1].id : null;
  }, [tasks, currentTaskId]);

  const handleSelectChoice = useCallback(
    (choice: string) => {
      setChoiceHistory((prev) => [...prev.slice(0, choiceHistoryIdx + 1), choice]);
      setChoiceHistoryIdx((prev) => prev + 1);
    },
    [choiceHistoryIdx],
  );

  const handleTemplateChange = useCallback((name: string, value: string | string[]) => {
    setTemplateValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleAddSpan = useCallback((span: Omit<SpanAnnotation, 'id'>) => {
    setSpanAnnotations((prev) => [...prev, { ...span, id: crypto.randomUUID() }]);
  }, []);

  const handleRemoveSpan = useCallback((id: string) => {
    setSpanAnnotations((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!currentTask) return;

    let result: AnnotationResult[];
    const commentToSave = comment.trim();

    if (labelConfig) {
      // Template mode: build result from form values + NER spans
      const capturedValues = templateValues;
      const capturedSpans = spanAnnotations;
      result = [
        ...buildResultFromElements(labelConfig.elements, capturedValues),
        ...buildSpanResults(capturedSpans, nerLinks),
      ];
      if (result.length === 0) return; // nothing to submit

      const annotation: Annotation = {
        id: crypto.randomUUID(),
        taskId: currentTask.id,
        userId: currentUser.id,
        result,
        comment: commentToSave || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'submitted',
      };

      setLocalAnnotations((prev) => [
        ...prev.filter((a) => a.taskId !== currentTask.id),
        annotation,
      ]);
      setCompletedIds((prev) => new Set([...prev, currentTask.id]));
      setComment('');
      // Don't reset templateValues — user may want to see what they submitted

      if (settings.autoAdvance) {
        const nextId = getNextTaskId();
        if (nextId) handleSelectTask(nextId);
      }

      try {
        await api.post(`/api/projects/${projectId}/tasks/${currentTask.id}/annotate`, {
          result,
          comment: commentToSave || undefined,
          status: 'submitted',
        });
        queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
        queryClient.invalidateQueries({ queryKey: ['annotations', projectId] });
      } catch {
        // optimistic update already applied
      }
    } else {
      // Simple mode
      if (!selectedChoice) return;

      const choiceToSave = selectedChoice;
      const reasoningToSave = selectedReasoning;

      result = [
        {
          id: crypto.randomUUID(),
          type: 'choices',
          from_name: 'classification',
          to_name: 'task',
          value: { choices: [choiceToSave] },
        },
      ];
      if (reasoningToSave) {
        result.push({
          id: crypto.randomUUID(),
          type: 'taxonomy',
          from_name: 'reasoning',
          to_name: 'task',
          value: { choices: [reasoningToSave] },
        });
      }

      const annotation: Annotation = {
        id: crypto.randomUUID(),
        taskId: currentTask.id,
        userId: currentUser.id,
        result,
        comment: commentToSave || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'submitted',
      };

      setLocalAnnotations((prev) => [
        ...prev.filter((a) => a.taskId !== currentTask.id),
        annotation,
      ]);
      setCompletedIds((prev) => new Set([...prev, currentTask.id]));
      setSelectedReasoning(null);
      setComment('');

      if (settings.autoAdvance) {
        const nextId = getNextTaskId();
        if (nextId) handleSelectTask(nextId);
      }

      try {
        await api.post(`/api/projects/${projectId}/tasks/${currentTask.id}/annotate`, {
          choice: choiceToSave,
          reasoning: reasoningToSave ?? undefined,
          comment: commentToSave || undefined,
          status: 'submitted',
        });
        queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
        queryClient.invalidateQueries({ queryKey: ['annotations', projectId] });
      } catch {
        // optimistic update already applied
      }
    }
  }, [
    currentTask, comment, labelConfig, templateValues, spanAnnotations, nerLinks,
    selectedChoice, selectedReasoning,
    currentUser.id, projectId, queryClient, settings.autoAdvance, getNextTaskId, handleSelectTask,
  ]);

  const handleSkip = useCallback(async () => {
    if (!currentTask) return;

    const annotation: Annotation = {
      id: crypto.randomUUID(),
      taskId: currentTask.id,
      userId: currentUser.id,
      result: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'skipped',
    };

    setLocalAnnotations((prev) => [
      ...prev.filter((a) => a.taskId !== currentTask.id),
      annotation,
    ]);

    const nextId = getNextTaskId();
    if (nextId) handleSelectTask(nextId);

    try {
      await api.post(`/api/projects/${projectId}/tasks/${currentTask.id}/annotate`, {
        status: 'skipped',
      });
    } catch {
      // silent
    }
  }, [currentTask, currentUser.id, projectId, getNextTaskId, handleSelectTask]);

  const handleUndo = useCallback(() => {
    setChoiceHistoryIdx((prev) => Math.max(0, prev - 1));
  }, []);

  const handleRedo = useCallback(() => {
    setChoiceHistoryIdx((prev) => Math.min(choiceHistory.length - 1, prev + 1));
  }, [choiceHistory.length]);

  const handleReset = useCallback(() => {
    setChoiceHistory([null]);
    setChoiceHistoryIdx(0);
    setSelectedReasoning(null);
    setComment('');
    setTemplateValues({});
    setSpanAnnotations([]);
    setActiveNerLabel(null);
  }, []);

  const handleToggleGroundTruth = useCallback(() => {
    if (!currentTask) return;
    setGroundTruthIds((prev) => {
      const next = new Set(prev);
      next.has(currentTask.id) ? next.delete(currentTask.id) : next.add(currentTask.id);
      return next;
    });
  }, [currentTask]);

  // canSubmit
  const canSubmit = useMemo(() => {
    if (labelConfig) {
      const hasTemplateValue = Object.values(templateValues).some(
        (v) => v !== '' && !(Array.isArray(v) && v.length === 0),
      );
      return hasTemplateValue || spanAnnotations.length > 0;
    }
    return selectedChoice !== null;
  }, [labelConfig, templateValues, spanAnnotations, selectedChoice]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      )
        return;

      if (!labelConfig && e.key >= '1' && e.key <= String(choices.length)) {
        const idx = parseInt(e.key, 10) - 1;
        if (idx < choices.length) handleSelectChoice(choices[idx]);
      }

      if (e.key === 'Enter' && canSubmit) {
        e.preventDefault();
        handleSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canSubmit, handleSubmit, handleSelectChoice, choices, labelConfig]);

  // ── Render ─────────────────────────────────────────────────────────────

  if (projectLoading || tasksLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size={32} />
      </div>
    );
  }

  if (!backendProject) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="text-sm text-muted-foreground">Project not found.</span>
      </div>
    );
  }

  const htmlContent = currentTask?.data?.html ? String(currentTask.data.html) : null;

  const imageUrl = currentTask?.data
    ? (['product_image_url', 'image_url', 'image', 'photo_url', 'photo', 'thumbnail_url', 'img_url'] as const)
        .map((k) => currentTask.data[k])
        .find((v) => typeof v === 'string' && v.startsWith('http')) as string | undefined
    : undefined;

  const productTitle = currentTask?.data
    ? (['product_title', 'title', 'name', 'product_name'] as const)
        .map((k) => currentTask.data[k])
        .find((v) => typeof v === 'string' && v) as string | undefined
    : undefined;

  const hasContent = !!(htmlContent || imageUrl);

  return (
    <ResizablePanelGroup
      key={hasContent ? 'with-content' : 'no-content'}
      direction="horizontal"
      className="h-full"
    >
      {/* Panel 1: Task list */}
      <ResizablePanel defaultSize={hasContent ? 22 : 25} minSize={14} maxSize={35}>
        <TaskListPanel
          tasks={tasks}
          currentTaskId={currentTaskId}
          onSelectTask={handleSelectTask}
          annotations={localAnnotations}
          users={[currentUser]}
        />
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* Panel 2: Annotation controls */}
      <ResizablePanel defaultSize={hasContent ? 30 : 75} minSize={20} maxSize={hasContent ? 45 : 86}>
        <div className="relative h-full">
          {currentTask ? (
            <>
              <AnnotationPanel
                task={currentTask}
                annotation={existingAnnotation}
                currentUser={currentUser}
                users={[currentUser]}
                selectedChoice={selectedChoice}
                onSelectChoice={handleSelectChoice}
                onSubmit={handleSubmit}
                onSkip={handleSkip}
                choices={choices}
                reasoningChoices={reasoningChoices}
                selectedReasoning={selectedReasoning}
                onSelectReasoning={setSelectedReasoning}
                comment={comment}
                onChangeComment={setComment}
                showComments={settings.showComments}
                showReasoning={settings.showReasoning}
                showShortcuts={settings.showShortcuts}
                labelConfig={labelConfig}
                templateValues={templateValues}
                onTemplateChange={handleTemplateChange}
                ner={nerLinks.size > 0 ? {
                  spanAnnotations,
                  activeNerLabel,
                  onSetActiveNerLabel: setActiveNerLabel,
                  onAddSpan: handleAddSpan,
                  onRemoveSpan: handleRemoveSpan,
                } : undefined}
              />
              <BottomActionBar
                task={currentTask}
                onSubmit={handleSubmit}
                onSkip={handleSkip}
                onUndo={handleUndo}
                onRedo={handleRedo}
                onReset={handleReset}
                isStarred={groundTruthIds.has(currentTask.id)}
                onToggleStar={handleToggleGroundTruth}
                canSubmit={canSubmit}
                settings={settings}
                onChangeSettings={handleChangeSettings}
              />
            </>
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="text-sm text-muted-foreground px-4 text-center">
                {tasks.length === 0
                  ? 'No tasks found. Upload data in the Data Manager first.'
                  : 'Select a task to annotate.'}
              </span>
            </div>
          )}
        </div>
      </ResizablePanel>

      {/* Panel 3: Content panel — only rendered when there is HTML or image content */}
      {hasContent && (
        <>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={48} minSize={25}>
            <div className="flex flex-col h-full overflow-hidden bg-background">
              <div className="shrink-0 border-b border-border px-4 py-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {imageUrl ? 'Product Image' : 'Content'}
                </span>
              </div>
              {htmlContent ? (
                <iframe
                  key={currentTask?.id}
                  srcDoc={htmlContent}
                  title="Content"
                  className="flex-1 w-full border-0"
                  sandbox="allow-same-origin"
                />
              ) : (
                <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center gap-4">
                  {productTitle && (
                    <p className="text-sm font-semibold text-foreground text-center max-w-lg">{productTitle}</p>
                  )}
                  <img
                    key={currentTask?.id}
                    src={imageUrl}
                    alt={productTitle ?? 'Product image'}
                    className="max-w-full max-h-[70vh] object-contain rounded-lg border border-border shadow-sm"
                  />
                </div>
              )}
            </div>
          </ResizablePanel>
        </>
      )}
    </ResizablePanelGroup>
  );
}

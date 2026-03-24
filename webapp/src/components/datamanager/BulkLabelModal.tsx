import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Tags, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

// ── XML parsing ───────────────────────────────────────────────────────────────

const FALLBACK_CHOICES = ['Fully Meets Intent', 'Partially Meets Intent', 'Irrelevant', 'Unknown'];

interface ParsedConfig {
  choices: string[];
  /** All taxonomy sub-cases, grouped by category */
  taxonomyGroups: { label: string; subcases: string[] }[];
  hasReasoning: boolean;
  hasComments: boolean;
}

function parseProjectConfig(project: any): ParsedConfig {
  const xml = project?.labelingTemplates?.[0]?.config?.xml as string | undefined;

  let choices = FALLBACK_CHOICES;
  const taxonomyGroups: { label: string; subcases: string[] }[] = [];
  let hasReasoning = false;
  let hasComments = false;

  if (xml) {
    try {
      const doc = new DOMParser().parseFromString(xml, 'text/xml');

      // Main choices
      const choicesEl = doc.querySelector('Choices');
      if (choicesEl) {
        const vals = Array.from(choicesEl.querySelectorAll(':scope > Choice'))
          .map((el) => el.getAttribute('value') ?? '')
          .filter(Boolean);
        if (vals.length > 0) choices = vals;
      }

      // Taxonomy (reasoning)
      const taxonomy = doc.querySelector('Taxonomy');
      if (taxonomy) {
        hasReasoning = true;
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
          taxonomyGroups.push({ label, subcases });
        }
      }

      // TextArea (comments)
      if (doc.querySelector('TextArea')) hasComments = true;

    } catch {}
  }

  // Fallback: check config.labels array
  if (choices === FALLBACK_CHOICES) {
    const labels = project?.labelingTemplates?.[0]?.config?.labels;
    if (Array.isArray(labels) && labels.length > 0) choices = labels as string[];
  }

  return { choices, taxonomyGroups, hasReasoning, hasComments };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function RadioList({
  label,
  options,
  selected,
  onSelect,
  showShortcuts = false,
}: {
  label: string;
  options: string[];
  selected: string | null;
  onSelect: (v: string) => void;
  showShortcuts?: boolean;
}) {
  if (options.length === 0) return null;
  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="flex flex-col gap-1.5">
        {options.map((option, index) => {
          const isSelected = selected === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onSelect(option)}
              className={cn(
                'flex items-center justify-between rounded-md border px-3 py-2.5 text-sm transition-all text-left',
                'hover:border-primary/50 hover:bg-primary/5',
                isSelected
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border bg-background text-foreground',
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex h-4 w-4 items-center justify-center rounded-full border-2 transition-colors shrink-0',
                    isSelected ? 'border-primary' : 'border-muted-foreground/40',
                  )}
                >
                  {isSelected && <div className="h-2 w-2 rounded-full bg-primary" />}
                </div>
                <span className={cn(isSelected && 'font-medium')}>{option}</span>
              </div>
              {showShortcuts && (
                <span className="text-[10px] font-mono text-muted-foreground border border-border rounded px-1.5 py-0.5">
                  {index + 1}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface BulkLabelModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  selectedTaskIds: string[];
  onSuccess: () => void;
}

export function BulkLabelModal({
  open,
  onClose,
  projectId,
  selectedTaskIds,
  onSuccess,
}: BulkLabelModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [selectedReasoning, setSelectedReasoning] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.get<any>(`/api/projects/${projectId}`),
    enabled: open && !!projectId,
  });

  const config = project ? parseProjectConfig(project) : {
    choices: FALLBACK_CHOICES,
    taxonomyGroups: [],
    hasReasoning: false,
    hasComments: false,
  };

  // Flatten all taxonomy sub-cases across groups for bulk (no per-task filter)
  const allReasoningOptions = config.taxonomyGroups.flatMap((g) => g.subcases);

  const hasSelection = selectedTaskIds.length > 0;

  function handleClose() {
    if (submitting) return;
    setSelectedChoice(null);
    setSelectedReasoning(null);
    setComment('');
    onClose();
  }

  async function handleApply() {
    if (!selectedChoice || !hasSelection) return;
    setSubmitting(true);
    try {
      await api.post(`/api/projects/${projectId}/tasks/bulk-annotate`, {
        taskIds: selectedTaskIds,
        choice: selectedChoice,
        reasoning: selectedReasoning ?? undefined,
        comment: comment.trim() || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      await queryClient.invalidateQueries({ queryKey: ['tasks', projectId, 'labeling'] });
      await queryClient.invalidateQueries({ queryKey: ['annotations', projectId] });
      toast({
        title: 'Bulk label applied',
        description: `${selectedTaskIds.length} task${selectedTaskIds.length === 1 ? '' : 's'} labelled as "${selectedChoice}".`,
      });
      onSuccess();
      handleClose();
    } catch {
      toast({
        title: 'Error',
        description: 'Could not apply bulk label. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />

      <div className="relative z-10 w-full max-w-md rounded-lg border border-border bg-card shadow-xl" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Tags className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Bulk Label</h2>
          </div>
          <button
            onClick={handleClose}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto" style={{ flex: '1 1 auto', minHeight: 0 }}>
          <div className="px-5 py-5 space-y-5">
            {/* Task count banner */}
            <div className={cn(
              'rounded-md px-4 py-3 text-sm',
              hasSelection
                ? 'bg-primary/5 border border-primary/20 text-foreground'
                : 'bg-muted text-muted-foreground'
            )}>
              {hasSelection ? (
                <>
                  <span className="font-semibold">{selectedTaskIds.length}</span>{' '}
                  task{selectedTaskIds.length === 1 ? '' : 's'} selected — the chosen label will be applied to all of them.
                </>
              ) : (
                'No tasks selected. Check the boxes on the rows you want to bulk label, then try again.'
              )}
            </div>

            {hasSelection && (
              <>
                {/* Main label choices */}
                <RadioList
                  label="Label"
                  options={config.choices}
                  selected={selectedChoice}
                  onSelect={setSelectedChoice}
                  showShortcuts
                />

                {/* Reasoning (taxonomy) — all sub-cases, unfiltered */}
                {config.hasReasoning && allReasoningOptions.length > 0 && (
                  <RadioList
                    label="Reasoning"
                    options={allReasoningOptions}
                    selected={selectedReasoning}
                    onSelect={setSelectedReasoning}
                  />
                )}

                {/* Comment — always shown */}
                <div className="space-y-1.5">
                  <span className="text-sm font-medium text-foreground">Comment</span>
                  <textarea
                    placeholder="Add a comment for these tasks (optional)…"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                    className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-5 py-4">
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={!hasSelection || !selectedChoice || submitting}
          >
            {submitting
              ? 'Applying…'
              : hasSelection && selectedChoice
              ? `Apply to ${selectedTaskIds.length} task${selectedTaskIds.length === 1 ? '' : 's'}`
              : 'Apply'}
          </Button>
        </div>
      </div>
    </div>
  );
}

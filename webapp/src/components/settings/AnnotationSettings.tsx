import { useState } from 'react';
import { AlertTriangle, Info, Users, Shuffle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export interface AnnotationSettingsData {
  allowEmptyAnnotations: boolean;
  showDataManagerToAnnotators: boolean;
  allowSkipping: boolean;
  requireCommentToSkip: boolean;
  skipQueue: 'requeue_same' | 'requeue_others' | 'ignore';
  usePredictionsToPreLabel: boolean;
  revealPreAnnotationsInteractively: boolean;
  showInstructionsBeforeLabeling: boolean;
  instructions: string;
  taskAssignment: 'automatic' | 'manual';
}

interface AnnotationSettingsProps {
  initialSettings: AnnotationSettingsData;
  onSave: (settings: AnnotationSettingsData) => Promise<void>;
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  info,
  indent,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  info?: boolean;
  indent?: boolean;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4 py-4', indent && 'pl-6 border-l-2 border-border ml-3')}>
      <div className="flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-foreground">{label}</span>
          {info && <Info className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{description}</p>
        )}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="pt-6 pb-2 border-b border-border">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    </div>
  );
}

function RadioOption({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        'flex items-start gap-3 py-2.5 cursor-pointer',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      <div className="mt-0.5 flex-shrink-0">
        <input
          type="radio"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="accent-primary h-4 w-4"
        />
      </div>
      <div>
        <span className="text-sm font-medium text-foreground">{label}</span>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </label>
  );
}

export function AnnotationSettings({ initialSettings, onSave }: AnnotationSettingsProps) {
  const [settings, setSettings] = useState<AnnotationSettingsData>(initialSettings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function update<K extends keyof AnnotationSettingsData>(key: K, value: AnnotationSettingsData[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-6 space-y-0">

      {/* ── Annotation Options ──────────────────────────────── */}
      <SectionHeader title="Annotation Options" />

      <ToggleRow
        label="Allow empty annotations"
        description="Allow annotators to submit tasks without labeling any elements"
        checked={settings.allowEmptyAnnotations}
        onChange={(v) => update('allowEmptyAnnotations', v)}
      />

      <ToggleRow
        label="Show Data Manager to Annotators"
        description="Provides annotators access to the Data Manager with task visibility based on assignment mode"
        checked={settings.showDataManagerToAnnotators}
        onChange={(v) => update('showDataManagerToAnnotators', v)}
        info
      />

      {/* ── Task Skipping ───────────────────────────────────── */}
      <SectionHeader title="Task Skipping" />

      <ToggleRow
        label="Allow skipping tasks"
        description="Displays a Skip button that allows annotators to skip tasks"
        checked={settings.allowSkipping}
        onChange={(v) => update('allowSkipping', v)}
      />

      {settings.allowSkipping && (
        <>
          <ToggleRow
            label="Require comment to skip"
            description="Require a comment from annotators when skipping a task"
            checked={settings.requireCommentToSkip}
            onChange={(v) => update('requireCommentToSkip', v)}
            indent
          />

          <div className="pl-6 border-l-2 border-border ml-3 pb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-3 pb-2">
              Skip Queue
            </p>
            <div className="space-y-0.5">
              <RadioOption
                label="Requeue skipped tasks back to the annotator"
                description="Requeue to the end of the same annotator's queue"
                checked={settings.skipQueue === 'requeue_same'}
                onChange={() => update('skipQueue', 'requeue_same')}
              />
              <RadioOption
                label="Requeue skipped tasks to others (Automatic Task Assignment Only)"
                description="Requeue skipped tasks to other annotators"
                checked={settings.skipQueue === 'requeue_others'}
                onChange={() => update('skipQueue', 'requeue_others')}
                disabled={settings.taskAssignment !== 'automatic'}
              />
              <RadioOption
                label="Ignore skipped"
                description="No one sees skipped tasks and tasks with skipped annotations are finished"
                checked={settings.skipQueue === 'ignore'}
                onChange={() => update('skipQueue', 'ignore')}
              />
            </div>
          </div>
        </>
      )}

      {/* ── Task Pre-labeling ───────────────────────────────── */}
      <SectionHeader title="Task Pre-labeling" />

      <ToggleRow
        label="Use predictions to pre-label Tasks"
        description="Enable to use the selected set of predictions below to pre-populate labels. Predictions will pre-load in Label All Tasks and Quick View."
        checked={settings.usePredictionsToPreLabel}
        onChange={(v) => update('usePredictionsToPreLabel', v)}
      />

      {settings.usePredictionsToPreLabel && (
        <div className="ml-3 pl-6 border-l-2 border-border pb-2 space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-3 pb-1">
              Model or predictions to use
            </p>
            <p className="text-xs text-muted-foreground mb-2">
              Select the model predictions to use for pre-labeling
            </p>
            <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 px-3 py-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-400 flex-1">
                No model or predictions available
              </p>
              <Button size="sm" variant="outline" className="h-7 text-xs">
                Add a Model
              </Button>
            </div>
          </div>

          <ToggleRow
            label="Reveal pre-annotations interactively"
            description="Pre-annotations remain hidden until an annotator adds a region, allowing focused review and reducing bias."
            checked={settings.revealPreAnnotationsInteractively}
            onChange={(v) => update('revealPreAnnotationsInteractively', v)}
          />
        </div>
      )}

      {/* ── Annotation Instructions ─────────────────────────── */}
      <SectionHeader title="Annotation Instructions" />

      <ToggleRow
        label="Show instructions before labeling"
        description="Display instructions in a pop-up window when annotators enter the labeling stream"
        checked={settings.showInstructionsBeforeLabeling}
        onChange={(v) => update('showInstructionsBeforeLabeling', v)}
      />

      <div className="py-3 space-y-2">
        <Label className="text-sm font-medium text-foreground">Instructions</Label>
        <Textarea
          placeholder="E.g. Label all vehicles in the image..."
          value={settings.instructions}
          onChange={(e) => update('instructions', e.target.value)}
          rows={4}
          className="resize-none"
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm">Preview</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
          </Button>
        </div>
      </div>

      {/* ── Task Assignment ─────────────────────────────────── */}
      <SectionHeader title="Task Assignment" />

      <div className="py-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {/* Automatic card */}
          <button
            type="button"
            onClick={() => update('taskAssignment', 'automatic')}
            className={cn(
              'flex flex-col items-center gap-3 rounded-lg border-2 p-5 text-left transition-all hover:border-primary/50',
              settings.taskAssignment === 'automatic'
                ? 'border-primary bg-primary/5'
                : 'border-border bg-card',
            )}
          >
            <div className={cn(
              'flex h-10 w-10 items-center justify-center rounded-full border-2',
              settings.taskAssignment === 'automatic' ? 'border-primary text-primary' : 'border-muted-foreground/30 text-muted-foreground',
            )}>
              <Shuffle className="h-5 w-5" />
            </div>
            <div className="text-center">
              <p className={cn('text-sm font-semibold', settings.taskAssignment === 'automatic' ? 'text-foreground' : 'text-muted-foreground')}>
                Automatic
              </p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Tasks are ordered and assigned automatically
              </p>
            </div>
          </button>

          {/* Manual card */}
          <button
            type="button"
            onClick={() => update('taskAssignment', 'manual')}
            className={cn(
              'flex flex-col items-center gap-3 rounded-lg border-2 p-5 text-left transition-all hover:border-primary/50',
              settings.taskAssignment === 'manual'
                ? 'border-primary bg-primary/5'
                : 'border-border bg-card',
            )}
          >
            <div className={cn(
              'flex h-10 w-10 items-center justify-center rounded-full border-2',
              settings.taskAssignment === 'manual' ? 'border-primary text-primary' : 'border-muted-foreground/30 text-muted-foreground',
            )}>
              <Users className="h-5 w-5" />
            </div>
            <div className="text-center">
              <p className={cn('text-sm font-semibold', settings.taskAssignment === 'manual' ? 'text-foreground' : 'text-muted-foreground')}>
                Manual
              </p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Annotators are only shown tasks assigned to them
              </p>
            </div>
          </button>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}

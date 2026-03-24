import { useState } from 'react';
import { Info } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface ReviewSettingsData {
  showInstructionsBeforeReviewing: boolean;
  reviewInstructions: string;
  rejectAction: 'remove_from_queue' | 'requeue_to_annotator' | 'reviewer_decides';
  requireCommentOnReject: boolean;
  showDataManagerToReviewers: boolean;
  showUnusedColumnsToReviewers: boolean;
  showAgreementToReviewers: boolean;
  reviewedWhen: 'one_accepted' | 'all_reviewed';
  showOnlyManuallyAssigned: boolean;
  showOnlyFinishedTasks: boolean;
  taskOrdering: 'by_task_id' | 'random';
  taskLimitPercent: number;
}

interface ReviewSettingsProps {
  initialSettings: ReviewSettingsData;
  onSave: (settings: ReviewSettingsData) => Promise<void>;
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="pt-6 pb-2 border-b border-border">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    </div>
  );
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

function RadioOption({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-start gap-3 py-2.5 cursor-pointer">
      <div className="mt-0.5 flex-shrink-0">
        <input
          type="radio"
          checked={checked}
          onChange={onChange}
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

export function ReviewSettings({ initialSettings, onSave }: ReviewSettingsProps) {
  const [settings, setSettings] = useState<ReviewSettingsData>(initialSettings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function update<K extends keyof ReviewSettingsData>(key: K, value: ReviewSettingsData[K]) {
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

      {/* ── Reject Options ───────────────────────────────── */}
      <SectionHeader title="Reject Options" />

      <div className="py-4 space-y-0.5">
        <RadioOption
          label="Remove from queue"
          description="Rejected annotations are removed from the queue and the task is finished"
          checked={settings.rejectAction === 'remove_from_queue'}
          onChange={() => update('rejectAction', 'remove_from_queue')}
        />
        <RadioOption
          label="Requeue to annotator"
          description="Rejected annotations are sent back to the original annotator for correction"
          checked={settings.rejectAction === 'requeue_to_annotator'}
          onChange={() => update('rejectAction', 'requeue_to_annotator')}
        />
        <RadioOption
          label="Reviewer decides"
          description="Reviewer can choose what happens to the rejected annotation"
          checked={settings.rejectAction === 'reviewer_decides'}
          onChange={() => update('rejectAction', 'reviewer_decides')}
        />
      </div>

      <ToggleRow
        label="Reviewers must leave a comment on reject"
        description="Require a comment when a reviewer rejects an annotation"
        checked={settings.requireCommentOnReject}
        onChange={(v) => update('requireCommentOnReject', v)}
      />

      {/* ── Data Manager ─────────────────────────────────── */}
      <SectionHeader title="Data Manager" />

      <ToggleRow
        label="Show Data Manager to Reviewers"
        description="Provides reviewers access to the Data Manager"
        checked={settings.showDataManagerToReviewers}
        onChange={(v) => update('showDataManagerToReviewers', v)}
        info
      />

      {settings.showDataManagerToReviewers && (
        <>
          <ToggleRow
            label="Show unused columns to Reviewers"
            description="Display columns that aren't part of the active labeling configuration"
            checked={settings.showUnusedColumnsToReviewers}
            onChange={(v) => update('showUnusedColumnsToReviewers', v)}
            indent
          />
          <ToggleRow
            label="Show agreement to Reviewers"
            description="Display inter-annotator agreement scores in the Data Manager"
            checked={settings.showAgreementToReviewers}
            onChange={(v) => update('showAgreementToReviewers', v)}
            indent
          />
        </>
      )}

      {/* ── Instructions ─────────────────────────────────── */}
      <SectionHeader title="Instructions" />

      <ToggleRow
        label="Show instructions before reviewing"
        description="Display instructions in a pop-up window when reviewers enter the review stream"
        checked={settings.showInstructionsBeforeReviewing}
        onChange={(v) => update('showInstructionsBeforeReviewing', v)}
      />

      <div className="py-3 space-y-2">
        <Label className="text-sm font-medium text-foreground">Review Instructions</Label>
        <Textarea
          placeholder="E.g. Accept annotations that correctly identify all vehicles..."
          value={settings.reviewInstructions}
          onChange={(e) => update('reviewInstructions', e.target.value)}
          rows={4}
          className="resize-none"
        />
        <div className="flex justify-end gap-2">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
          </Button>
        </div>
      </div>

      {/* ── Reviewing Options ────────────────────────────── */}
      <SectionHeader title="Reviewing Options" />

      <div className="py-4 space-y-0.5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pb-2">
          Task is reviewed when
        </p>
        <RadioOption
          label="One annotation is accepted"
          description="A task is considered reviewed once at least one annotation is accepted"
          checked={settings.reviewedWhen === 'one_accepted'}
          onChange={() => update('reviewedWhen', 'one_accepted')}
        />
        <RadioOption
          label="All annotations are reviewed"
          description="A task is considered reviewed only when all annotations have been reviewed"
          checked={settings.reviewedWhen === 'all_reviewed'}
          onChange={() => update('reviewedWhen', 'all_reviewed')}
        />
      </div>

      <ToggleRow
        label="Show only manually assigned tasks"
        description="Reviewers only see tasks that have been explicitly assigned to them"
        checked={settings.showOnlyManuallyAssigned}
        onChange={(v) => update('showOnlyManuallyAssigned', v)}
      />

      <ToggleRow
        label="Show only finished tasks"
        description="Only show tasks where all annotations are complete"
        checked={settings.showOnlyFinishedTasks}
        onChange={(v) => update('showOnlyFinishedTasks', v)}
      />

      {/* ── Task Ordering ─────────────────────────────────── */}
      <SectionHeader title="Task Ordering" />

      <div className="py-4 space-y-0.5">
        <RadioOption
          label="Order by task ID"
          description="Tasks are presented to reviewers in their default order"
          checked={settings.taskOrdering === 'by_task_id'}
          onChange={() => update('taskOrdering', 'by_task_id')}
        />
        <RadioOption
          label="Random order"
          description="Tasks are presented in a random order to reduce bias"
          checked={settings.taskOrdering === 'random'}
          onChange={() => update('taskOrdering', 'random')}
        />
      </div>

      <div className="py-3 space-y-2">
        <Label className="text-sm font-medium text-foreground">
          Task limit (% of tasks to review)
        </Label>
        <p className="text-xs text-muted-foreground">
          Set the percentage of tasks that should be reviewed. 100% means all tasks are reviewed.
        </p>
        <div className="flex items-center gap-3">
          <Input
            type="number"
            min={1}
            max={100}
            value={settings.taskLimitPercent}
            onChange={(e) => {
              const val = Math.min(100, Math.max(1, Number(e.target.value)));
              update('taskLimitPercent', val);
            }}
            className="w-24"
          />
          <span className="text-sm text-muted-foreground">%</span>
        </div>
      </div>

      <div className="flex justify-end py-4">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
        </Button>
      </div>
    </div>
  );
}

import { useState, useMemo } from 'react';
import { CheckSquare, ChevronDown } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface QualitySettingsData {
  limitTasksPerAnnotator: boolean;
  taskLimitPerAnnotator: number;
  agreementMetric: 'basic_matching';
  customWeights: Record<string, number>;
}

interface QualitySettingsProps {
  initialSettings: QualitySettingsData;
  labelConfigXml: string;
  onSave: (settings: QualitySettingsData) => Promise<void>;
}

interface TagDef {
  name: string;
  type: string;
  labels: Array<{ value: string; color?: string }>;
}

const LABEL_COLORS = [
  '#FF6B6B', '#FF8E53', '#FFC842', '#A8E063', '#4ECDC4',
  '#45B7D1', '#96CEB4', '#DEB887', '#A29BFE', '#6C5CE7',
  '#74B9FF', '#FD79A8', '#FDCB6E', '#00B894', '#E17055',
];

function parseLabelingConfig(xml: string): TagDef[] {
  if (!xml) return [];
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    const tagTypes = [
      'Taxonomy', 'Choices', 'Labels', 'BrushLabels', 'EllipseLabels',
      'PolygonLabels', 'RectangleLabels', 'KeyPointLabels',
    ];
    const defs: TagDef[] = [];
    for (const tagType of tagTypes) {
      const elements = doc.getElementsByTagName(tagType);
      for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        const name = el.getAttribute('name') || `${tagType}-${i}`;
        const labels: { value: string; color?: string }[] = [];
        const choiceEls = el.getElementsByTagName('Choice');
        for (let j = 0; j < choiceEls.length; j++) {
          const val = choiceEls[j].getAttribute('value');
          const bg = choiceEls[j].getAttribute('background');
          if (val) labels.push({ value: val, color: bg || undefined });
        }
        if (labels.length > 0) {
          defs.push({ name, type: tagType, labels });
        }
      }
    }
    return defs;
  } catch {
    return [];
  }
}

const SHOW_INITIALLY = 5;

function TagWeightSection({
  tag,
  weights,
  onWeightChange,
}: {
  tag: TagDef;
  weights: Record<string, number>;
  onWeightChange: (key: string, value: number) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const tagWeight = weights[tag.name] ?? 100;
  const visibleLabels = showAll ? tag.labels : tag.labels.slice(0, SHOW_INITIALLY);
  const hasMore = tag.labels.length > SHOW_INITIALLY;

  return (
    <div className="border border-border rounded-md overflow-hidden">
      {/* Header row */}
      <div
        className="flex items-center gap-3 px-4 py-3 bg-muted/20 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-sm font-medium flex-1">{tag.name}</span>
        <span className="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium">
          {tag.type}
        </span>
        <div
          className="flex items-center gap-1 ml-4"
          onClick={(e) => e.stopPropagation()}
        >
          <Input
            type="number"
            min={0}
            max={100}
            value={tagWeight}
            onChange={(e) =>
              onWeightChange(tag.name, Math.min(100, Math.max(0, Number(e.target.value))))
            }
            className="w-16 h-7 text-sm text-right"
          />
          <span className="text-sm text-muted-foreground">%</span>
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform ml-1',
            expanded && 'rotate-180',
          )}
        />
      </div>

      {/* Label rows */}
      {expanded && (
        <div className="divide-y divide-border">
          {visibleLabels.map((label, idx) => {
            const labelKey = `${tag.name}::${label.value}`;
            const labelWeight = weights[labelKey] ?? 100;
            const color = label.color ?? LABEL_COLORS[idx % LABEL_COLORS.length];
            return (
              <div key={label.value} className="flex items-center gap-3 px-4 py-2.5">
                <div className="flex-1">
                  <span
                    className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium"
                    style={{
                      borderLeft: `4px solid ${color}`,
                      backgroundColor: `${color}18`,
                    }}
                  >
                    {label.value}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={labelWeight}
                    onChange={(e) =>
                      onWeightChange(labelKey, Math.min(100, Math.max(0, Number(e.target.value))))
                    }
                    className="w-16 h-7 text-sm text-right"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
            );
          })}
          {hasMore && !showAll && (
            <div className="px-4 py-2.5">
              <button
                className="text-sm text-primary hover:underline"
                onClick={() => setShowAll(true)}
              >
                Show all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function QualitySettings({ initialSettings, labelConfigXml, onSave }: QualitySettingsProps) {
  const [settings, setSettings] = useState<QualitySettingsData>(initialSettings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const tagDefs = useMemo(() => parseLabelingConfig(labelConfigXml), [labelConfigXml]);

  function update<K extends keyof QualitySettingsData>(key: K, value: QualitySettingsData[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function updateWeight(key: string, value: number) {
    setSettings((prev) => ({
      ...prev,
      customWeights: { ...prev.customWeights, [key]: value },
    }));
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

  const saveLabel = saving ? 'Saving…' : saved ? 'Saved!' : 'Save';

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Quality</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage project-wide settings for annotation overlap, annotator evaluation, and task agreement metrics.
        </p>
      </div>

      {/* ── Tasks Per Annotator Limit ─────────────────────────── */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Tasks Per Annotator Limit</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Control the number of tasks each annotator can annotate.
          </p>
        </div>

        <div className="flex items-start gap-3">
          <Switch
            checked={settings.limitTasksPerAnnotator}
            onCheckedChange={(v) => update('limitTasksPerAnnotator', v)}
          />
          <div>
            <p className="text-sm font-medium text-foreground">Limit tasks per annotator</p>
            <p className="text-xs text-muted-foreground">Enable to configure limits.</p>
          </div>
        </div>

        {settings.limitTasksPerAnnotator ? (
          <div className="flex items-center gap-3 pl-10">
            <label className="text-sm font-medium text-foreground">Max tasks per annotator</label>
            <Input
              type="number"
              min={1}
              value={settings.taskLimitPerAnnotator}
              onChange={(e) =>
                update('taskLimitPerAnnotator', Math.max(1, Number(e.target.value)))
              }
              className="w-24"
            />
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground pl-1">
            <CheckSquare className="h-4 w-4" />
            <span>No limits currently configured.</span>
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saveLabel}
          </Button>
        </div>
      </div>

      {/* ── Agreement ─────────────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Agreement</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Select the metric used to calculate agreement for the project.
          </p>
        </div>

        <div className="space-y-1.5">
          <p className="text-sm font-medium text-foreground">Agreement metric</p>
          <p className="text-xs text-muted-foreground">
            Method used to calculate annotation agreement.
          </p>
          <Select
            value={settings.agreementMetric}
            onValueChange={(v) => update('agreementMetric', v as 'basic_matching')}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="basic_matching">Basic matching function</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground pt-1">
            Learn more about{' '}
            <span className="text-primary cursor-pointer hover:underline">
              Basic matching function ↗
            </span>
          </p>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saveLabel}
          </Button>
        </div>
      </div>

      {/* ── Custom Weights ────────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Custom Weights</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Set custom weights for tags and labels to change the agreement calculation.
            These options are automatically generated from the labeling interface setup.
            Weights set to zero are ignored from calculation.
          </p>
        </div>

        {tagDefs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No labeling interface configured. Set up a labeling interface to configure custom weights.
          </p>
        ) : (
          <div className="space-y-3">
            {tagDefs.map((tag) => (
              <TagWeightSection
                key={tag.name}
                tag={tag}
                weights={settings.customWeights}
                onWeightChange={updateWeight}
              />
            ))}
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saveLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

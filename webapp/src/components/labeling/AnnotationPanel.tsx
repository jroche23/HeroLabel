import { useMemo, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, ExternalLink } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  substituteVariables,
  type LabelConfigElement,
  type ParsedLabelConfig,
} from '@/lib/labelConfigParser';
import { AnnotatableText } from '@/components/labeling/AnnotatableText';
import type { Task, Annotation, User, TaskData, SpanAnnotation, NerLabelState } from '@/types';

/** NER input props passed from LabelingInterface → AnnotationPanel */
export interface NerInput {
  spanAnnotations: SpanAnnotation[];
  activeNerLabel: NerLabelState | null;
  onSetActiveNerLabel: (label: NerLabelState | null) => void;
  onAddSpan: (span: Omit<SpanAnnotation, 'id'>) => void;
  onRemoveSpan: (id: string) => void;
}

/** Full NER context (includes nerLinks built from config.labels) — used inside AnnotationPanel */
interface NerContext extends NerInput {
  nerLinks: Map<string, string>; // textName -> labelsName
}

interface AnnotationPanelProps {
  task: Task;
  annotation: Annotation | undefined;
  currentUser: User;
  users: User[];
  selectedChoice: string | null;
  onSelectChoice: (choice: string) => void;
  onSubmit: () => void;
  onSkip: () => void;
  /** Override choices — used only in simple mode (no labelConfig) */
  choices?: string[];
  /** Taxonomy sub-cases — used only in simple mode */
  reasoningChoices?: string[];
  selectedReasoning?: string | null;
  onSelectReasoning?: (value: string) => void;
  comment?: string;
  onChangeComment?: (value: string) => void;
  showComments?: boolean;
  showReasoning?: boolean;
  showShortcuts?: boolean;
  /** Full parsed XML label config — when present, renders full template form */
  labelConfig?: ParsedLabelConfig | null;
  /** Template form values keyed by field name */
  templateValues?: Record<string, string | string[]>;
  onTemplateChange?: (name: string, value: string | string[]) => void;
  /** NER (Named Entity Recognition) props — passed when the label config has Labels elements */
  ner?: NerInput;
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 30) return `${diffDays} days ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return '1 month ago';
  return `${diffMonths} months ago`;
}

function formatFieldName(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

// ── Simple mode task data display ─────────────────────────────────────────

const geoCache = new Map<string, string>();

async function reverseGeocode(lat: number, lon: number): Promise<string> {
  const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  if (geoCache.has(key)) return geoCache.get(key)!;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      { headers: { 'Accept-Language': 'en' } },
    );
    const json = await res.json();
    const addr = json.address ?? {};
    const parts = [
      addr.city || addr.town || addr.village || addr.county || '',
      addr.country || '',
    ].filter(Boolean);
    const result = parts.join(', ') || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    geoCache.set(key, result);
    return result;
  } catch {
    return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  }
}

function formatDate(raw: unknown): string {
  if (!raw) return '—';
  const d = new Date(String(raw));
  if (isNaN(d.getTime())) return String(raw);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function findField(data: TaskData, candidates: string[]): string {
  for (const key of candidates) {
    const lower = key.toLowerCase();
    for (const [k, v] of Object.entries(data)) {
      if (k.toLowerCase() === lower && v !== undefined && v !== null && String(v).trim() !== '') {
        return String(v);
      }
    }
  }
  return '';
}

function TaskDataField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <span className="w-36 shrink-0 text-sm font-medium text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground break-words">{value}</span>
    </div>
  );
}

const HIDDEN_FIELDS = new Set([
  'html', 'annotation_label', 'task_state', 'inner_id', 'annotators',
]);

function isOutputField(key: string): boolean {
  return key.endsWith('_labeled') || key.endsWith('_boolean') || key.endsWith('_verify');
}

function TaskDataDisplay({ data }: { data: TaskData }) {
  const queryValue = findField(data, ['search_query', 'query', 'Query', 'search_term', 'term', 'keyword', 'text']);
  const classValue = findField(data, ['classification', 'label', 'category', 'type', 'class']);
  const lat = parseFloat(findField(data, ['latitude', 'lat']) || 'NaN');
  const lon = parseFloat(findField(data, ['longitude', 'lon', 'lng']) || 'NaN');
  const hasCoords = !isNaN(lat) && !isNaN(lon);
  const entityId = findField(data, ['global_entity_id', 'entity_id', 'location', 'country', 'region', 'city']);

  const [locationLabel, setLocationLabel] = useState<string>(() =>
    hasCoords ? 'Loading…' : (entityId || '—'),
  );

  useEffect(() => {
    if (!hasCoords) { setLocationLabel(entityId || '—'); return; }
    const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
    if (geoCache.has(key)) { setLocationLabel(geoCache.get(key)!); return; }
    setLocationLabel('Loading…');
    reverseGeocode(lat, lon).then(setLocationLabel);
  }, [lat, lon, hasCoords, entityId]);

  const dateValue = findField(data, ['timestamp_utc', 'created_at', 'date', 'timestamp', 'updated_at']);

  const knownKeys = new Set(['search_query', 'query', 'Query', 'search_term', 'term', 'keyword', 'text',
    'classification', 'label', 'category', 'type', 'class',
    'latitude', 'lat', 'longitude', 'lon', 'lng', 'global_entity_id', 'entity_id', 'location', 'country', 'region', 'city',
    'timestamp_utc', 'created_at', 'date', 'timestamp', 'updated_at',
  ]);
  const imageKeys = new Set(['product_image_url', 'image_url', 'image', 'photo_url', 'photo', 'thumbnail_url', 'img_url']);

  const extraFields = Object.entries(data).filter(([k, v]) =>
    !HIDDEN_FIELDS.has(k) && !knownKeys.has(k) && !imageKeys.has(k) && !isOutputField(k) &&
    v !== undefined && v !== null && String(v).trim() !== '',
  );

  const hasAnyKnown = queryValue || classValue || locationLabel !== '—' || dateValue;

  if (!hasAnyKnown) {
    return (
      <div className="rounded-lg border border-border bg-card overflow-hidden divide-y divide-border">
        {Object.entries(data)
          .filter(([k, v]) => !HIDDEN_FIELDS.has(k) && !imageKeys.has(k) && !isOutputField(k) && v !== undefined && v !== null && String(v).trim() !== '')
          .map(([k, v]) => (
            <TaskDataField key={k} label={formatFieldName(k)} value={String(v ?? '—')} />
          ))}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden divide-y divide-border">
      {queryValue && (
        <TaskDataField label="Query" value={
          <span className="font-semibold text-foreground">{queryValue}</span>
        } />
      )}
      {classValue && <TaskDataField label="Classification" value={classValue} />}
      {(hasCoords || entityId) && <TaskDataField label="Location" value={locationLabel} />}
      {dateValue && <TaskDataField label="Date" value={formatDate(dateValue)} />}
      {extraFields.map(([k, v]) => (
        <TaskDataField key={k} label={formatFieldName(k)} value={String(v ?? '—')} />
      ))}
    </div>
  );
}

// ── Simple mode controls ───────────────────────────────────────────────────

function ChoicesControl({
  choices,
  selectedChoice,
  onSelectChoice,
  label = 'Label',
  showShortcuts = true,
}: {
  choices: string[];
  selectedChoice: string | null;
  onSelectChoice: (choice: string) => void;
  label?: string;
  showShortcuts?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="flex flex-col gap-1.5">
        {choices.map((choice, index) => {
          const isSelected = selectedChoice === choice;
          return (
            <button
              key={choice}
              type="button"
              onClick={() => onSelectChoice(choice)}
              className={cn(
                'flex items-center justify-between rounded-md border px-3 py-2.5 text-sm transition-all',
                'hover:border-primary/50 hover:bg-primary/5',
                isSelected
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border bg-card text-foreground',
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2',
                  isSelected ? 'border-primary' : 'border-muted-foreground/40',
                )}>
                  {isSelected && <div className="h-2 w-2 rounded-full bg-primary" />}
                </div>
                <span className={cn(isSelected && 'font-medium')}>{choice}</span>
              </div>
              {showShortcuts && (
                <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-mono text-muted-foreground">
                  {index + 1}
                </Badge>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ReasoningControl({
  choices,
  selected,
  onSelect,
}: {
  choices: string[];
  selected: string | null;
  onSelect: (v: string) => void;
}) {
  if (choices.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-foreground">Reasoning</span>
      <div className="flex flex-col gap-1.5">
        {choices.map((choice) => {
          const isSelected = selected === choice;
          return (
            <button
              key={choice}
              type="button"
              onClick={() => onSelect(choice)}
              className={cn(
                'flex items-center gap-3 rounded-md border px-3 py-2 text-sm transition-all text-left',
                'hover:border-primary/50 hover:bg-primary/5',
                isSelected
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border bg-card text-foreground',
              )}
            >
              <div className={cn(
                'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2',
                isSelected ? 'border-primary' : 'border-muted-foreground/40',
              )}>
                {isSelected && <div className="h-2 w-2 rounded-full bg-primary" />}
              </div>
              <span className={cn(isSelected && 'font-medium')}>{choice}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Template form renderer ────────────────────────────────────────────────

type TemplateValues = Record<string, string | string[]>;
type TemplateOnChange = (name: string, value: string | string[]) => void;

interface ChoiceOption {
  value: string;
  label: string;
  disabled?: boolean;
}

function extractChoiceOptions(element: LabelConfigElement, data: TaskData): ChoiceOption[] {
  return (element.children ?? [])
    .filter((c) => c.type === 'Choice')
    .map((c) => {
      const rawValue = c.value ?? '';
      const substituted = substituteVariables(rawValue, data);
      const alias = c.attributes?.alias;
      const textContent = c.textContent;
      const label = alias || textContent || substituted;
      return {
        value: substituted,
        label,
        disabled: c.attributes?.disabled === 'true',
      };
    })
    .filter((o) => o.value); // skip empty values after substitution
}

/**
 * Extract leaf choices from a Taxonomy element, optionally filtered to a matching branch.
 * If `classification` matches the first word of a branch name (case-insensitive), only
 * that branch's leaves are returned plus any top-level leaf (e.g. "None of the above").
 * If no branch matches, all leaves are returned.
 */
function extractTaxonomyLeaves(element: LabelConfigElement, classification?: string): string[] {
  const topChoices = (element.children ?? []).filter((c) => c.type === 'Choice');

  function gatherLeaves(nodes: LabelConfigElement[]): string[] {
    const leaves: string[] = [];
    function traverse(el: LabelConfigElement) {
      const childChoices = (el.children ?? []).filter((c) => c.type === 'Choice');
      if (childChoices.length === 0) {
        if (el.value) leaves.push(el.value);
      } else {
        for (const child of childChoices) traverse(child);
      }
    }
    for (const node of nodes) traverse(node);
    return leaves;
  }

  if (classification) {
    // Normalize classification to the taxonomy branch first-word
    const classLower = classification.trim().toLowerCase();
    const CLASSIFICATION_MAP: Record<string, string> = {
      item: 'dish',
      unclassified: 'other',
    };
    const normalizedClass = CLASSIFICATION_MAP[classLower] ?? classLower;
    // Find a branch whose first word matches the (possibly remapped) classification
    const matched = topChoices.filter((c) => {
      const firstWord = (c.value ?? '').split(/\s+/)[0].toLowerCase();
      return firstWord === normalizedClass;
    });
    // Top-level leaves (e.g. "None of the above" — nodes with no children)
    const topLeaves = topChoices
      .filter((c) => (c.children ?? []).filter((ch) => ch.type === 'Choice').length === 0)
      .flatMap((c) => (c.value ? [c.value] : []));

    if (matched.length > 0) {
      return [...gatherLeaves(matched), ...topLeaves];
    }
  }

  return gatherLeaves(topChoices);
}

// Single-choice radio buttons
function SingleChoicesField({
  name,
  options,
  value,
  onChange,
  showShortcuts,
}: {
  name: string;
  options: ChoiceOption[];
  value: string | string[] | undefined;
  onChange: TemplateOnChange;
  showShortcuts?: boolean;
}) {
  const current = Array.isArray(value) ? value[0] : (value ?? '');
  const filtered = options.filter((o) => !o.disabled);

  return (
    <div className="flex flex-col gap-1.5">
      {filtered.map((opt, index) => {
        const isSelected = current === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(name, opt.value)}
            className={cn(
              'flex items-center justify-between rounded-md border px-3 py-2.5 text-sm transition-all',
              'hover:border-primary/50 hover:bg-primary/5',
              isSelected
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border bg-card text-foreground',
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2',
                isSelected ? 'border-primary' : 'border-muted-foreground/40',
              )}>
                {isSelected && <div className="h-2 w-2 rounded-full bg-primary" />}
              </div>
              <span className={cn(isSelected && 'font-medium')}>{opt.label}</span>
            </div>
            {showShortcuts && (
              <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-mono text-muted-foreground">
                {index + 1}
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}

// Multi-choice checkboxes
function MultipleChoicesField({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: ChoiceOption[];
  value: string | string[] | undefined;
  onChange: TemplateOnChange;
}) {
  const selected = Array.isArray(value) ? value : value ? [value] : [];
  const filtered = options.filter((o) => !o.disabled);

  function toggle(val: string) {
    const next = selected.includes(val)
      ? selected.filter((v) => v !== val)
      : [...selected, val];
    onChange(name, next);
  }

  return (
    <div className="flex flex-col gap-1.5">
      {filtered.map((opt) => {
        const isChecked = selected.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className={cn(
              'flex items-center gap-3 rounded-md border px-3 py-2.5 text-sm transition-all text-left',
              'hover:border-primary/50 hover:bg-primary/5',
              isChecked
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border bg-card text-foreground',
            )}
          >
            <div className={cn(
              'flex h-4 w-4 shrink-0 items-center justify-center rounded border-2',
              isChecked ? 'border-primary bg-primary' : 'border-muted-foreground/40',
            )}>
              {isChecked && (
                <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className={cn(isChecked && 'font-medium')}>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// Single-choice dropdown <select>
function SelectSingleField({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: ChoiceOption[];
  value: string | string[] | undefined;
  onChange: TemplateOnChange;
}) {
  const current = Array.isArray(value) ? value[0] : (value ?? '');

  return (
    <select
      value={current}
      onChange={(e) => onChange(name, e.target.value)}
      className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
    >
      <option value="">— Select —</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} disabled={opt.disabled}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

// Multi-choice dropdown with search filter (checkboxes in a scrollable list)
function SelectMultipleField({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: ChoiceOption[];
  value: string | string[] | undefined;
  onChange: TemplateOnChange;
}) {
  const [search, setSearch] = useState('');
  const selected = Array.isArray(value) ? value : value ? [value] : [];
  const filtered = options
    .filter((o) => !o.disabled)
    .filter((o) => o.label.toLowerCase().includes(search.toLowerCase()));

  function toggle(val: string) {
    const next = selected.includes(val)
      ? selected.filter((v) => v !== val)
      : [...selected, val];
    onChange(name, next);
  }

  return (
    <div className="rounded-md border border-border overflow-hidden">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Filter options…"
        className="w-full px-3 py-2 text-sm border-b border-border bg-card focus:outline-none"
      />
      <div className="max-h-48 overflow-y-auto divide-y divide-border">
        {filtered.length === 0 && (
          <p className="px-3 py-2 text-sm text-muted-foreground">No options match</p>
        )}
        {filtered.map((opt) => {
          const isChecked = selected.includes(opt.value);
          return (
            <label
              key={opt.value}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer select-none',
                isChecked ? 'bg-primary/5 text-foreground' : 'hover:bg-muted text-foreground',
              )}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => toggle(opt.value)}
                className="rounded"
              />
              <span className={cn(isChecked && 'font-medium')}>{opt.label}</span>
            </label>
          );
        })}
      </div>
      {selected.length > 0 && (
        <div className="px-3 py-1.5 bg-muted border-t border-border">
          <span className="text-xs text-muted-foreground">{selected.length} selected</span>
        </div>
      )}
    </div>
  );
}

// Taxonomy (nested choices rendered as flat searchable leaf list)
function TaxonomyFormField({
  element,
  data,
  values,
  onChange,
}: {
  element: LabelConfigElement;
  data: TaskData;
  values: TemplateValues;
  onChange: TemplateOnChange;
}) {
  const [search, setSearch] = useState('');
  const name = element.name ?? '';
  const classification = findField(data, ['classification', 'class', 'category', 'type']) || undefined;
  const leaves = useMemo(() => extractTaxonomyLeaves(element, classification), [element, classification]);
  const current = values[name];
  const currentVal = Array.isArray(current) ? current[0] : (current ?? null);

  const filtered = leaves.filter((l) =>
    l.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-2">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search…"
        className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <div className="max-h-64 overflow-y-auto flex flex-col gap-1">
        {filtered.map((choice) => {
          const isSelected = currentVal === choice;
          return (
            <button
              key={choice}
              type="button"
              onClick={() => onChange(name, choice)}
              className={cn(
                'flex items-center gap-3 rounded-md border px-3 py-2 text-sm text-left transition-all',
                'hover:border-primary/50 hover:bg-primary/5',
                isSelected
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border bg-card text-foreground',
              )}
            >
              <div className={cn(
                'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2',
                isSelected ? 'border-primary' : 'border-muted-foreground/40',
              )}>
                {isSelected && <div className="h-2 w-2 rounded-full bg-primary" />}
              </div>
              <span className={cn(isSelected && 'font-medium')}>{choice}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Render a Choices element with appropriate control based on its attributes
function ChoicesFormField({
  element,
  data,
  values,
  onChange,
  showShortcuts,
}: {
  element: LabelConfigElement;
  data: TaskData;
  values: TemplateValues;
  onChange: TemplateOnChange;
  showShortcuts?: boolean;
}) {
  const name = element.name ?? '';
  const choiceMode = element.attributes?.choice ?? 'single';
  const layout = element.attributes?.layout; // 'select' or undefined
  const options = extractChoiceOptions(element, data);
  const value = values[name];

  // Check for Header children (section description inside Choices)
  const headerChildren = (element.children ?? []).filter((c) => c.type === 'Header');

  return (
    <div className="flex flex-col gap-2">
      {name && (
        <span className="text-sm font-medium text-foreground">{formatFieldName(name)}</span>
      )}
      {headerChildren.map((h, i) => (
        <p key={i} className="text-sm text-muted-foreground">
          {substituteVariables(h.value ?? '', data)}
        </p>
      ))}
      {layout === 'select' ? (
        choiceMode === 'multiple' ? (
          <SelectMultipleField name={name} options={options} value={value} onChange={onChange} />
        ) : (
          <SelectSingleField name={name} options={options} value={value} onChange={onChange} />
        )
      ) : (
        choiceMode === 'multiple' ? (
          <MultipleChoicesField name={name} options={options} value={value} onChange={onChange} />
        ) : (
          <SingleChoicesField name={name} options={options} value={value} onChange={onChange} showShortcuts={showShortcuts} />
        )
      )}
    </div>
  );
}

// Render a TextArea element
function TextAreaFormField({
  element,
  values,
  onChange,
}: {
  element: LabelConfigElement;
  values: TemplateValues;
  onChange: TemplateOnChange;
}) {
  const name = element.name ?? '';
  const placeholder = element.attributes?.placeholder ?? '';
  const rows = parseInt(element.attributes?.rows ?? '2', 10);
  const value = values[name];
  const current = Array.isArray(value) ? value.join(', ') : (value ?? '');

  return (
    <textarea
      value={current}
      onChange={(e) => onChange(name, e.target.value)}
      placeholder={placeholder}
      rows={Math.max(1, rows)}
      className="w-full resize-none rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
    />
  );
}

// Recursively render a single XML element as part of the template form
function RenderFormElement({
  element,
  data,
  values,
  onChange,
  showShortcuts,
  depth = 0,
  ner,
}: {
  element: LabelConfigElement;
  data: TaskData;
  values: TemplateValues;
  onChange: TemplateOnChange;
  showShortcuts?: boolean;
  depth?: number;
  ner?: NerContext;
}): React.ReactElement | null {
  switch (element.type) {
    case 'View': {
      const children = element.children ?? [];
      if (children.length === 0) return null;
      return (
        <div className="flex flex-col gap-3">
          {children.map((child, i) => (
            <RenderFormElement
              key={i}
              element={child}
              data={data}
              values={values}
              onChange={onChange}
              showShortcuts={showShortcuts}
              depth={depth + 1}
              ner={ner}
            />
          ))}
        </div>
      );
    }

    case 'Header': {
      const text = substituteVariables(element.value ?? '', data);
      if (!text) return null;
      // Top-level headers (numbered sections) get a distinct style
      const isSection = /^\d+\./.test(text.trim());
      return (
        <div
          className={cn(
            'text-sm font-semibold',
            isSection
              ? 'text-foreground bg-muted rounded-md px-3 py-2 uppercase tracking-wide'
              : 'text-muted-foreground',
          )}
        >
          {text}
        </div>
      );
    }

    case 'Text': {
      const textStr = substituteVariables(element.value ?? '', data);
      const textName = element.name ?? '';

      // If this Text element is an NER annotation target, render as annotatable
      if (ner && textName && ner.nerLinks.has(textName)) {
        const linkedLabelsName = ner.nerLinks.get(textName)!;
        const isActive = ner.activeNerLabel?.labelsElementName === linkedLabelsName;
        const mySpans = ner.spanAnnotations.filter((s) => s.textName === textName);
        return (
          <div className="flex flex-col gap-1">
            <AnnotatableText
              textName={textName}
              text={textStr}
              spans={ner.spanAnnotations}
              activeLabel={isActive ? ner.activeNerLabel : null}
              onAddSpan={ner.onAddSpan}
              onRemoveSpan={ner.onRemoveSpan}
            />
            {!isActive && mySpans.length === 0 && (
              <p className="text-xs text-muted-foreground/50 pl-0.5">
                Select a label below, then highlight text here to annotate
              </p>
            )}
            {mySpans.length > 0 && !isActive && (
              <p className="text-xs text-muted-foreground/50 pl-0.5">
                {mySpans.length} span{mySpans.length !== 1 ? 's' : ''} annotated — click any to remove, or select a label to add more
              </p>
            )}
          </div>
        );
      }

      if (!textStr) return null;
      return (
        <p className="text-sm text-muted-foreground" style={element.style}>
          {textStr}
        </p>
      );
    }

    case 'HyperText': {
      // Skip elements that just render the raw $html field — that content is shown in the right panel
      if (element.value?.trim() === '$html') return null;
      const rawHtml = element.value ?? '';
      const html = substituteVariables(rawHtml, data);
      if (!html) return null;
      return (
        <div
          className="text-sm [&_a]:text-blue-600 [&_a]:hover:underline"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    }

    case 'Choices': {
      return (
        <ChoicesFormField
          element={element}
          data={data}
          values={values}
          onChange={onChange}
          showShortcuts={showShortcuts && depth <= 1}
        />
      );
    }

    case 'TextArea': {
      return (
        <TextAreaFormField element={element} values={values} onChange={onChange} />
      );
    }

    case 'Taxonomy': {
      return (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground">
            {formatFieldName(element.name ?? 'Reasoning')}
          </span>
          <TaxonomyFormField element={element} data={data} values={values} onChange={onChange} />
        </div>
      );
    }

    case 'Labels': {
      const labels = (element.children ?? []).filter((c) => c.type === 'Label');
      if (labels.length === 0) return null;

      const labelsElementName = element.name ?? '';
      // NER-enabled when this Labels element has a toName linked to a Text element
      const isNerEnabled = !!(ner && element.toName && ner.nerLinks.has(element.toName));

      return (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {element.name ? formatFieldName(element.name) : 'Entity labels'}
            {isNerEnabled ? (
              <span className="ml-1 normal-case font-normal text-primary/60">
                — click a label, then highlight text
              </span>
            ) : labels.some((l) => l.attributes?.hint) ? (
              <span className="ml-1 normal-case font-normal text-muted-foreground/60">(Hover for info)</span>
            ) : null}
          </span>
          <TooltipProvider delayDuration={200}>
            <div className="flex flex-wrap gap-1.5">
              {labels.map((label, i) => {
                const val = label.value ?? label.attributes?.value ?? '';
                const hint = label.attributes?.hint;
                const bg = label.attributes?.background ?? label.attributes?.color;
                const isActive =
                  isNerEnabled &&
                  ner?.activeNerLabel?.labelsElementName === labelsElementName &&
                  ner?.activeNerLabel?.value === val;

                if (isNerEnabled && ner) {
                  const chip = (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        if (isActive) {
                          ner.onSetActiveNerLabel(null);
                        } else {
                          ner.onSetActiveNerLabel({ labelsElementName, value: val, color: bg });
                        }
                      }}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium transition-all',
                        isActive ? 'ring-2 ring-offset-1 shadow-sm' : 'opacity-70 hover:opacity-100',
                      )}
                      style={
                        bg
                          ? { borderLeft: `3px solid ${bg}`, background: isActive ? `${bg}35` : `${bg}18` }
                          : { borderLeft: '3px solid #94a3b8', background: isActive ? '#94a3b835' : '#94a3b818' }
                      }
                    >
                      {isActive && (
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: bg ?? '#94a3b8' }}
                        />
                      )}
                      {val}
                    </button>
                  );
                  if (!hint) return chip;
                  return (
                    <Tooltip key={i}>
                      <TooltipTrigger asChild>{chip}</TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[220px] text-xs">{hint}</TooltipContent>
                    </Tooltip>
                  );
                }

                // Non-NER: static display chips
                const chip = (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium cursor-default select-none"
                    style={bg ? { borderLeft: `3px solid ${bg}`, background: `${bg}18` } : { borderLeft: '3px solid #94a3b8', background: '#94a3b818' }}
                  >
                    {val}
                  </span>
                );
                if (!hint) return chip;
                return (
                  <Tooltip key={i}>
                    <TooltipTrigger asChild>{chip}</TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[220px] text-xs">{hint}</TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>
          {isNerEnabled && ner?.activeNerLabel?.labelsElementName === labelsElementName && (
            <p className="text-xs italic" style={{ color: ner.activeNerLabel.color ?? '#6366f1' }}>
              Annotating as &ldquo;{ner.activeNerLabel.value}&rdquo; — highlight text above
            </p>
          )}
        </div>
      );
    }

    // Elements skipped in the annotation panel (shown elsewhere or CSS only)
    case 'Image':
    case 'Style':
    case 'Choice':
    case 'Label':
    case 'Unknown':
      return null;

    default:
      return null;
  }
}

// Full template form — renders all elements from parsed XML config
function FullTemplateForm({
  config,
  data,
  values,
  onChange,
  showShortcuts,
  nerInput,
}: {
  config: ParsedLabelConfig;
  data: TaskData;
  values: TemplateValues;
  onChange: TemplateOnChange;
  showShortcuts?: boolean;
  nerInput?: NerInput;
}) {
  // Build NerContext: extend NerInput with nerLinks derived from config.labels
  const ner = useMemo((): NerContext | undefined => {
    if (!nerInput || config.labels.length === 0) return undefined;
    const nerLinks = new Map<string, string>();
    config.labels.forEach((l) => nerLinks.set(l.toName, l.name));
    return { ...nerInput, nerLinks };
  }, [nerInput, config.labels]);

  return (
    <div className="flex flex-col gap-4">
      {config.elements.map((element, i) => (
        <RenderFormElement
          key={i}
          element={element}
          data={data}
          values={values}
          onChange={onChange}
          showShortcuts={showShortcuts}
          depth={0}
          ner={ner}
        />
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function AnnotationPanel({
  task,
  annotation,
  currentUser,
  users,
  selectedChoice,
  onSelectChoice,
  choices: overrideChoices,
  reasoningChoices,
  selectedReasoning,
  onSelectReasoning,
  comment,
  onChangeComment,
  showComments = true,
  showReasoning = true,
  showShortcuts = true,
  labelConfig,
  templateValues,
  onTemplateChange,
  ner,
}: AnnotationPanelProps) {
  const annotatorUser = annotation
    ? users.find((u) => u.id === annotation.userId) ?? currentUser
    : currentUser;

  const annotationDate = annotation?.createdAt ?? new Date().toISOString();

  const isTemplateMode = !!labelConfig;

  // Detect query for Google search link (simple mode only)
  const searchQuery = isTemplateMode
    ? ''
    : findField(task.data, ['search_query', 'query', 'Query', 'search_term', 'term', 'keyword', 'text']);
  const googleSearchUrl = searchQuery ? `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}` : '';

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-4 p-4">
        {/* Header bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserAvatar initials={annotatorUser.initials} color={annotatorUser.color} size="md" />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground">{annotatorUser.email}</span>
              <span className="text-xs text-muted-foreground">{formatTimeAgo(annotationDate)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="text-xs">Compare All</Button>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isTemplateMode ? (
          // ── Template mode: full XML-driven form ──
          <FullTemplateForm
            config={labelConfig}
            data={task.data}
            values={templateValues ?? {}}
            onChange={onTemplateChange ?? (() => {})}
            showShortcuts={showShortcuts}
            nerInput={ner}
          />
        ) : (
          // ── Simple mode: task data + choices + reasoning ──
          <>
            <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
              Review and label this task based on the data below
            </div>

            <TaskDataDisplay data={task.data} />

            {searchQuery && (
              <a
                href={googleSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Search Google for "{searchQuery}"
              </a>
            )}

            <ChoicesControl
              choices={overrideChoices ?? ['Fully Meets Intent', 'Partially Meets Intent', 'Irrelevant', 'Unknown']}
              selectedChoice={selectedChoice}
              onSelectChoice={onSelectChoice}
              showShortcuts={showShortcuts}
            />

            {showReasoning && reasoningChoices && reasoningChoices.length > 0 && onSelectReasoning && (
              <ReasoningControl
                choices={reasoningChoices}
                selected={selectedReasoning ?? null}
                onSelect={onSelectReasoning}
              />
            )}
          </>
        )}

        {/* Comment — both modes */}
        {showComments && onChangeComment !== undefined && (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">Comment</span>
            <textarea
              placeholder="Add a comment for this task (optional)…"
              value={comment ?? ''}
              onChange={(e) => onChangeComment(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        )}

        <div className="h-16" />
      </div>
    </ScrollArea>
  );
}

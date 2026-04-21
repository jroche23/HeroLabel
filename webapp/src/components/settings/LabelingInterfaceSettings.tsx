import { useState, useMemo, useEffect, useRef } from 'react';
import { Sparkles, Mic, Send, ChevronDown, ChevronRight } from 'lucide-react';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { xml } from '@codemirror/lang-xml';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import type { Extension } from '@codemirror/state';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  parseLabelConfig,
  substituteVariables,
  type LabelConfigElement,
  type ParsedLabelConfig,
} from '@/lib/labelConfigParser';

type SubTab = 'ai' | 'code' | 'visual' | 'plugins';
type LangId = 'xml' | 'html' | 'css' | 'javascript' | 'jsx' | 'typescript' | 'tsx';

const LANGUAGES: { id: LangId; label: string }[] = [
  { id: 'xml',        label: 'XML (Label Studio)' },
  { id: 'html',       label: 'HTML' },
  { id: 'css',        label: 'CSS' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'jsx',        label: 'React / JSX' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'tsx',        label: 'React / TSX' },
];

function getLangExtension(id: LangId): Extension {
  switch (id) {
    case 'html':       return html();
    case 'css':        return css();
    case 'javascript': return javascript();
    case 'jsx':        return javascript({ jsx: true });
    case 'typescript': return javascript({ typescript: true });
    case 'tsx':        return javascript({ jsx: true, typescript: true });
    case 'xml':
    default:           return xml();
  }
}

// Sample task data used in the preview to demonstrate variable substitution
const SAMPLE_DATA: Record<string, string> = {
  search_query: 'Pizza near me',
  classification: 'Food',
  html: '<b>Pizza Hut</b><br>Fast food, Italian<br>⭐ 4.2 · 1845 reviews · 25 min',
  text: 'This restaurant has great food and fast delivery.',
  label: 'Example label text',
  entity: 'Restaurant',
  title: 'Sample Title',
  content: 'Sample content goes here.',
  url: 'https://example.com',
  description: 'A sample description for this task.',
  image: 'https://via.placeholder.com/400x200',
};

// ── Template Presets ─────────────────────────────────────────────────────────

interface Preset {
  id: string;
  label: string;
  description: string;
  xml: string;
}

const PRESETS: Preset[] = [
  {
    id: 'text-classification',
    label: 'Text Classification',
    description: 'Classify text into categories',
    xml: `<View>
  <Header value="Classify the text below:"/>
  <Text name="text" value="$text"/>
  <Choices name="label" toName="text" choice="single" showInLine="false">
    <Choice value="Positive"/>
    <Choice value="Negative"/>
    <Choice value="Neutral"/>
  </Choices>
</View>`,
  },
  {
    id: 'search-relevance',
    label: 'Search Relevance',
    description: 'Rate search result relevance',
    xml: `<View>
  <Header value="Search Query"/>
  <Text name="query" value="$search_query"/>
  <Header value="Result"/>
  <HyperText name="result" value="$html"/>
  <Header value="How relevant is this result?"/>
  <Choices name="relevance" toName="result" choice="single">
    <Choice value="Highly Relevant"/>
    <Choice value="Somewhat Relevant"/>
    <Choice value="Not Relevant"/>
  </Choices>
  <TextArea name="comment" toName="result" placeholder="Optional comment..." rows="2"/>
</View>`,
  },
  {
    id: 'sentiment',
    label: 'Sentiment Analysis',
    description: 'Analyse sentiment with reasoning',
    xml: `<View>
  <Text name="text" value="$text"/>
  <Choices name="sentiment" toName="text" choice="single" showInLine="true">
    <Choice value="Positive"/>
    <Choice value="Negative"/>
    <Choice value="Neutral"/>
    <Choice value="Mixed"/>
  </Choices>
  <TextArea name="reasoning" toName="text" placeholder="Explain your choice..." rows="3"/>
</View>`,
  },
  {
    id: 'two-column',
    label: 'Two-Column Layout',
    description: 'Side-by-side query and result',
    xml: `<View style="display:flex;gap:16px">
  <View style="flex:1">
    <Header value="Search Query"/>
    <Text name="query" value="$search_query"/>
    <Header value="Classification"/>
    <Choices name="label" toName="query" choice="single">
      <Choice value="Relevant"/>
      <Choice value="Irrelevant"/>
      <Choice value="Partially Relevant"/>
    </Choices>
  </View>
  <View style="flex:1">
    <Header value="Result"/>
    <HyperText name="result" value="$html"/>
    <TextArea name="notes" toName="result" placeholder="Notes..." rows="3"/>
  </View>
</View>`,
  },
];

interface LabelingInterfaceSettingsProps {
  labelConfig: string;
  onSave: (xml: string) => void;
}

export function LabelingInterfaceSettings({
  labelConfig: initialLabelConfig,
  onSave,
}: LabelingInterfaceSettingsProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('code');
  const [labelConfig, setLabelConfig] = useState<string>(initialLabelConfig);
  const [codeLang, setCodeLang] = useState<LangId>('xml');
  const [pluginsLang, setPluginsLang] = useState<LangId>('jsx');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const parsedConfig = useMemo(() => parseLabelConfig(labelConfig), [labelConfig]);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(labelConfig);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  function applyPreset(preset: Preset) {
    setLabelConfig(preset.xml);
    setActiveSubTab('code');
  }

  return (
    <div className="flex h-full flex-col">
      <div className="p-6 pb-0">
        <h2 className="text-lg font-semibold text-foreground">Labeling Interface</h2>
        <p className="text-sm text-muted-foreground">
          Configure the annotation form that annotators see for each task.
        </p>
      </div>

      {/* Presets strip */}
      <div className="px-6 pt-4">
        <p className="text-xs font-medium text-muted-foreground mb-2">Quick-start templates</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary hover:bg-primary/5 transition-colors"
              title={preset.description}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden p-6 lg:flex-row lg:gap-6">
        {/* Left Column – Editor */}
        <div className="flex flex-1 flex-col lg:w-[55%]">
          {/* Sub-tabs */}
          <div className="mb-4 flex items-center gap-1 border-b border-border">
            <SubTabButton active={activeSubTab === 'ai'} onClick={() => setActiveSubTab('ai')}>
              Generate with AI
              <Badge variant="secondary" className="ml-1.5 bg-rose-100 text-rose-600 text-[10px] px-1.5 py-0">
                Beta
              </Badge>
            </SubTabButton>
            <SubTabButton active={activeSubTab === 'code'} onClick={() => setActiveSubTab('code')}>
              Code
            </SubTabButton>
            <SubTabButton active={activeSubTab === 'visual'} onClick={() => setActiveSubTab('visual')}>
              Visual
            </SubTabButton>
            <SubTabButton active={activeSubTab === 'plugins'} onClick={() => setActiveSubTab('plugins')}>
              Plugins
            </SubTabButton>
          </div>

          {/* Sub-tab Content */}
          <div className="flex-1 overflow-auto">
            {activeSubTab === 'ai' && <AIGeneratePanel />}

            {activeSubTab === 'code' && (
              <div className="flex flex-col gap-2 h-full">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Language</span>
                  <Select value={codeLang} onValueChange={(v) => setCodeLang(v as LangId)}>
                    <SelectTrigger className="h-7 w-48 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((l) => (
                        <SelectItem key={l.id} value={l.id} className="text-xs">
                          {l.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <CodeMirrorEditor
                  key={codeLang}
                  value={labelConfig}
                  onChange={setLabelConfig}
                  lang={codeLang}
                />
              </div>
            )}

            {activeSubTab === 'visual' && (
              <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
                Coming Soon
              </div>
            )}

            {activeSubTab === 'plugins' && (
              <div className="flex flex-col gap-2 h-full">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Language</span>
                  <Select value={pluginsLang} onValueChange={(v) => setPluginsLang(v as LangId)}>
                    <SelectTrigger className="h-7 w-48 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.filter(l => ['javascript','jsx','typescript','tsx','css','html'].includes(l.id)).map((l) => (
                        <SelectItem key={l.id} value={l.id} className="text-xs">
                          {l.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <CodeMirrorEditor
                  key={pluginsLang}
                  value=""
                  onChange={() => {}}
                  lang={pluginsLang}
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Column – Preview */}
        <div className="mt-6 flex flex-col rounded-lg border border-border bg-card lg:mt-0 lg:w-[45%]">
          <div className="border-b border-border px-4 py-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Live Preview</h3>
            <span className="text-xs text-muted-foreground">Sample data</span>
          </div>
          <div className="flex-1 overflow-auto p-4">
            {parsedConfig ? (
              <LivePreview config={parsedConfig} />
            ) : labelConfig.trim() ? (
              <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                Invalid XML — check your configuration
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <p className="text-sm text-muted-foreground">
                  Start writing XML above or pick a template to see a live preview.
                </p>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <span className="text-xs text-muted-foreground">
              Variables like <code className="font-mono bg-muted px-1 rounded">$search_query</code> use sample values in preview
            </span>
            <Button onClick={handleSave} disabled={saving} size="sm">
              {saving ? 'Saving…' : saveSuccess ? 'Saved!' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── CodeMirror Editor ──────────────────────────────────────────────────────── */

function CodeMirrorEditor({
  value,
  onChange,
  lang,
}: {
  value: string;
  onChange: (val: string) => void;
  lang: LangId;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        getLangExtension(lang),
        oneDark,
        EditorView.theme({
          '&': { height: '100%', minHeight: '300px' },
          '.cm-scroller': { overflow: 'auto', fontFamily: 'monospace', fontSize: '13px' },
        }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: value } });
    }
  }, [value]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto rounded-lg border border-border [&_.cm-editor]:rounded-lg [&_.cm-editor.cm-focused]:outline-none"
      style={{ minHeight: 300 }}
    />
  );
}

/* ── Sub-tab button ─────────────────────────────────────────────────────────── */

function SubTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 border-b-2 px-3 py-2 text-sm transition-colors',
        active
          ? 'border-primary font-medium text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

/* ── AI Generate Panel ──────────────────────────────────────────────────────── */

function AIGeneratePanel() {
  return (
    <div className="rounded-lg bg-gradient-to-br from-rose-50 to-pink-50 p-6 dark:from-rose-950/30 dark:to-pink-950/30">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-rose-400 to-pink-500">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">
            Describe what you need — AI does the heavy lifting
          </h3>
          <p className="text-sm text-muted-foreground">
            Tell us about your labeling task and we will generate the configuration for you.
          </p>
        </div>
      </div>
      <div className="mt-4 rounded-lg border border-rose-200 bg-background p-3 dark:border-rose-800">
        <textarea
          className="min-h-[80px] w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          placeholder="Describe your labeling task... e.g., 'I need to classify text sentiment as positive, negative, or neutral'"
          disabled
        />
        <div className="mt-2 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled>
            <Mic className="mr-1.5 h-3.5 w-3.5" />
            Speak
          </Button>
          <Button size="sm" disabled>
            <Send className="mr-1.5 h-3.5 w-3.5" />
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Live Preview ────────────────────────────────────────────────────────────── */

function LivePreview({ config }: { config: ParsedLabelConfig }) {
  return (
    <div className="space-y-3">
      {config.elements.map((el, i) => (
        <PreviewElement key={i} element={el} />
      ))}
    </div>
  );
}

function PreviewElement({ element }: { element: LabelConfigElement }) {
  const [selectedChoices, setSelectedChoices] = useState<Set<string>>(new Set());
  const [textValue, setTextValue] = useState('');

  function resolveValue(val: string | undefined): string {
    if (!val) return '';
    return substituteVariables(val, SAMPLE_DATA as any);
  }

  switch (element.type) {
    case 'View': {
      const style = element.style ?? {};
      return (
        <div style={style as React.CSSProperties}>
          {element.children?.map((child, i) => (
            <PreviewElement key={i} element={child} />
          ))}
        </div>
      );
    }

    case 'Header':
      return (
        <p className="text-sm font-semibold text-foreground">{resolveValue(element.value)}</p>
      );

    case 'Text':
      return (
        <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-foreground whitespace-pre-wrap">
          {resolveValue(element.value) || <span className="text-muted-foreground italic">No content</span>}
        </div>
      );

    case 'HyperText': {
      const raw = resolveValue(element.value);
      return (
        <div
          className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: raw || '<span style="color:#aaa">HTML content</span>' }}
        />
      );
    }

    case 'Choices': {
      const isMultiple = element.attributes?.choice === 'multiple';
      const isSelect = element.attributes?.layout === 'select';
      const showInLine = element.attributes?.showInLine === 'true';
      const choices = (element.children ?? []).filter(c => c.type === 'Choice');
      const label = element.name ?? 'choices';

      if (isSelect) {
        return (
          <div className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
            <select
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              defaultValue=""
              onChange={() => {}}
            >
              <option value="" disabled>Select…</option>
              {choices.map((c, i) => (
                <option key={i} value={c.value ?? ''}>{c.value}</option>
              ))}
            </select>
          </div>
        );
      }

      return (
        <div className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
          <div className={cn('space-y-1.5', showInLine && 'flex flex-wrap gap-2 space-y-0')}>
            {choices.map((c, i) => {
              const val = c.value ?? '';
              const selected = selectedChoices.has(val);
              return (
                <label
                  key={i}
                  onClick={() => {
                    setSelectedChoices((prev) => {
                      const next = new Set(isMultiple ? prev : []);
                      if (prev.has(val)) next.delete(val);
                      else next.add(val);
                      return next;
                    });
                  }}
                  className={cn(
                    'flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 text-sm transition-colors',
                    showInLine ? 'inline-flex' : 'w-full',
                    selected
                      ? 'border-primary bg-primary/8 text-foreground font-medium'
                      : 'border-border bg-background text-foreground hover:bg-accent/50',
                  )}
                >
                  {isMultiple ? (
                    <span className={cn(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded border-2',
                      selected ? 'border-primary bg-primary' : 'border-muted-foreground/40',
                    )}>
                      {selected && <span className="h-2 w-2 rounded-sm bg-white" />}
                    </span>
                  ) : (
                    <span className={cn(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2',
                      selected ? 'border-primary' : 'border-muted-foreground/40',
                    )}>
                      {selected && <span className="h-2 w-2 rounded-full bg-primary" />}
                    </span>
                  )}
                  <span>{val}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{i + 1}</span>
                </label>
              );
            })}
          </div>
        </div>
      );
    }

    case 'TextArea':
      return (
        <div className="space-y-1.5">
          {element.attributes?.placeholder && (
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {element.name ?? 'text'}
            </span>
          )}
          <textarea
            rows={Number(element.attributes?.rows ?? 3)}
            placeholder={element.attributes?.placeholder ?? 'Enter text…'}
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      );

    case 'Taxonomy': {
      const [open, setOpen] = useState(false);
      const options = (element.children ?? [])
        .flatMap(branch =>
          (branch.children ?? []).map(leaf => `${branch.value} → ${leaf.value}`)
        );
      const topOptions = options.length === 0
        ? (element.children ?? []).map(c => c.value ?? '').filter(Boolean)
        : options;

      return (
        <div className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {element.name ?? 'taxonomy'}
          </span>
          <button
            onClick={() => setOpen(o => !o)}
            className="flex w-full items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-accent/50 transition-colors"
          >
            <span>Select categories…</span>
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          {open && (
            <div className="rounded-md border border-border bg-background px-2 py-2 space-y-1 max-h-40 overflow-y-auto">
              {topOptions.slice(0, 8).map((opt, i) => (
                <label key={i} className="flex items-center gap-2 px-2 py-1 text-xs text-foreground hover:bg-accent/50 rounded cursor-pointer">
                  <input type="checkbox" className="h-3 w-3" readOnly />
                  {opt}
                </label>
              ))}
              {topOptions.length > 8 && (
                <p className="px-2 py-1 text-xs text-muted-foreground">+{topOptions.length - 8} more…</p>
              )}
            </div>
          )}
        </div>
      );
    }

    case 'Style':
      return null;

    default:
      return null;
  }
}

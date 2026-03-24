import { useState, useMemo, useEffect, useRef } from 'react';
import { Sparkles, Mic, Send } from 'lucide-react';
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

  const parsedConfig = useMemo(() => parseLabelConfig(labelConfig), [labelConfig]);

  function handleSave() {
    onSave(labelConfig);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="p-6 pb-0">
        <h2 className="text-lg font-semibold text-foreground">Labeling Interface</h2>
        <p className="text-sm text-muted-foreground">
          Configure the labeling interface for annotators.
        </p>
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
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">Preview</h3>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <LabelPreview config={parsedConfig} />
          </div>
          <div className="flex justify-end border-t border-border px-4 py-3">
            <Button onClick={handleSave}>Save</Button>
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
  // lang change is handled via key prop on the parent
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync value when it changes externally (e.g. parent resets it)
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
            Describe what you need -- AI does the heavy lifting
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

/* ── XML Config Parser ──────────────────────────────────────────────────────── */

interface ParsedConfig {
  header: string;
  fields: { name: string; value: string }[];
  choices: { name: string; options: string[] };
  hasHyperText: boolean;
}

function parseLabelConfig(xml: string): ParsedConfig {
  const headerMatch = xml.match(/Header\s+value="([^"]*)"/);
  const header = headerMatch?.[1] ?? '';

  const fields: { name: string; value: string }[] = [];
  const textMatches = xml.matchAll(/Text\s+name="([^"]*)"\s+value="\$([^"]*)"/g);
  for (const m of textMatches) {
    fields.push({ name: m[1], value: m[2] });
  }

  const choicesMatch = xml.match(/Choices\s+name="([^"]*)"/);
  const choiceName = choicesMatch?.[1] ?? 'choices';
  const choiceOptions: string[] = [];
  const choiceMatches = xml.matchAll(/Choice\s+value="([^"]*)"/g);
  for (const m of choiceMatches) {
    choiceOptions.push(m[1]);
  }

  const hasHyperText = /HyperText/.test(xml);

  return { header, fields, choices: { name: choiceName, options: choiceOptions }, hasHyperText };
}

/* ── Label Preview ──────────────────────────────────────────────────────────── */

const SAMPLE_DATA: Record<string, string> = {
  search_query: 'Pizza near me',
  classification: 'Food Delivery',
  entity: 'Restaurant',
};

function LabelPreview({ config }: { config: ParsedConfig }) {
  return (
    <div className="space-y-4">
      {config.header ? (
        <div className="rounded-md bg-blue-50 px-3 py-2 text-sm font-medium text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
          {config.header}
        </div>
      ) : null}

      {config.fields.length > 0 ? (
        <div className="space-y-2">
          {config.fields.map((f) => (
            <div key={f.name} className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm">
              <span className="font-mono text-xs text-muted-foreground">{f.value}:</span>
              <span className="text-foreground">{SAMPLE_DATA[f.value] ?? `Sample ${f.value}`}</span>
            </div>
          ))}
        </div>
      ) : null}

      {config.choices.options.length > 0 ? (
        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {config.choices.name}
          </span>
          <div className="space-y-1.5">
            {config.choices.options.map((opt, i) => (
              <label key={opt} className="flex cursor-pointer items-center gap-2.5 rounded-md border border-border bg-background px-3 py-2 text-sm transition-colors hover:bg-accent/50">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-muted-foreground/40">
                  <span className="hidden h-2 w-2 rounded-full bg-primary" />
                </span>
                <span className="text-foreground">{opt}</span>
                <span className="ml-auto text-xs text-muted-foreground">{i + 1}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {config.hasHyperText ? (
        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Content</span>
          <div className="rounded-md border border-border bg-background p-4">
            <div className="space-y-2">
              <div className="text-base font-bold text-foreground">Pizza Hut</div>
              <div className="text-sm text-muted-foreground">Pizza, Italian, Fast Food</div>
              <div className="flex items-center gap-1 text-sm text-foreground">
                <span>4.2</span>
                <span className="text-muted-foreground">&middot; 1845 reviews</span>
              </div>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span>25 min delivery</span>
                <span>8 EUR min</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

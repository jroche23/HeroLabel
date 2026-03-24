import { useState, useMemo } from 'react';
import { Code, CheckCircle, XCircle, Image as ImageIcon, Type, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface ProjectFormData {
  workspaceId: string;
  name: string;
  description: string;
  importFiles: File[];
  importUrls: string[];
  labelConfig: string;
  templateId?: string;
}

interface LabelingSetupTabProps {
  formData: ProjectFormData;
  updateFormData: (updates: Partial<ProjectFormData>) => void;
}

interface ParsedElement {
  type: string;
  name?: string;
  value?: string;
  toName?: string;
  choices?: string[];
  labels?: string[];
  hotkeys?: Record<string, string>;
}

function parseXMLConfig(xml: string): { valid: boolean; elements: ParsedElement[]; error?: string } {
  if (!xml.trim()) {
    return { valid: true, elements: [] };
  }

  try {
    // Basic XML validation
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');

    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      return { valid: false, elements: [], error: 'Invalid XML syntax' };
    }

    const elements: ParsedElement[] = [];

    // Parse View element
    const view = doc.querySelector('View');
    if (!view) {
      return { valid: false, elements: [], error: 'Missing <View> root element' };
    }

    // Parse Image elements
    const images = view.querySelectorAll('Image');
    images.forEach((img) => {
      elements.push({
        type: 'Image',
        name: img.getAttribute('name') || undefined,
        value: img.getAttribute('value') || undefined,
      });
    });

    // Parse Text elements
    const texts = view.querySelectorAll('Text');
    texts.forEach((text) => {
      elements.push({
        type: 'Text',
        name: text.getAttribute('name') || undefined,
        value: text.getAttribute('value') || undefined,
      });
    });

    // Parse Header elements
    const headers = view.querySelectorAll('Header');
    headers.forEach((header) => {
      elements.push({
        type: 'Header',
        value: header.getAttribute('value') || undefined,
      });
    });

    // Parse Choices elements
    const choiceGroups = view.querySelectorAll('Choices');
    choiceGroups.forEach((group) => {
      const choices: string[] = [];
      const hotkeys: Record<string, string> = {};

      group.querySelectorAll('Choice').forEach((choice) => {
        const value = choice.getAttribute('value');
        const hotkey = choice.getAttribute('hotkey');
        if (value) {
          choices.push(value);
          if (hotkey) {
            hotkeys[value] = hotkey;
          }
        }
      });

      elements.push({
        type: 'Choices',
        name: group.getAttribute('name') || undefined,
        toName: group.getAttribute('toName') || undefined,
        choices,
        hotkeys,
      });
    });

    // Parse Labels elements (RectangleLabels, PolygonLabels, etc.)
    const labelTypes = ['RectangleLabels', 'PolygonLabels', 'BrushLabels', 'Labels'];
    labelTypes.forEach((labelType) => {
      const labelGroups = view.querySelectorAll(labelType);
      labelGroups.forEach((group) => {
        const labels: string[] = [];
        group.querySelectorAll('Label').forEach((label) => {
          const value = label.getAttribute('value');
          if (value) labels.push(value);
        });

        elements.push({
          type: labelType,
          name: group.getAttribute('name') || undefined,
          toName: group.getAttribute('toName') || undefined,
          labels,
        });
      });
    });

    // Parse HyperText elements
    const hyperTexts = view.querySelectorAll('HyperText');
    hyperTexts.forEach((ht) => {
      elements.push({
        type: 'HyperText',
        name: ht.getAttribute('name') || undefined,
        value: ht.getAttribute('value') || undefined,
      });
    });

    return { valid: true, elements };
  } catch (e) {
    return { valid: false, elements: [], error: 'Failed to parse XML' };
  }
}

function LabelPreview({ elements }: { elements: ParsedElement[] }) {
  if (elements.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Enter XML configuration to see preview
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {elements.map((el, idx) => {
        switch (el.type) {
          case 'Header':
            return (
              <div key={idx} className="font-medium text-foreground">
                {el.value || 'Header'}
              </div>
            );

          case 'Image':
            return (
              <div key={idx} className="border rounded-lg p-4 bg-muted/30">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                  <ImageIcon className="h-4 w-4" />
                  <span>Image: {el.name || 'image'}</span>
                </div>
                <div className="aspect-video bg-muted rounded flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">{el.value || '$image'}</p>
                  </div>
                </div>
              </div>
            );

          case 'Text':
            return (
              <div key={idx} className="border rounded-lg p-4 bg-muted/30">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                  <Type className="h-4 w-4" />
                  <span>Text: {el.name || 'text'}</span>
                </div>
                <p className="text-sm text-foreground">{el.value || '$text'}</p>
              </div>
            );

          case 'HyperText':
            return (
              <div key={idx} className="border rounded-lg p-4 bg-muted/30">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                  <Code className="h-4 w-4" />
                  <span>HTML Content: {el.name || 'content'}</span>
                </div>
                <div className="bg-white border rounded p-3 text-sm min-h-[60px]">
                  <span className="text-muted-foreground">{el.value || '$html'}</span>
                </div>
              </div>
            );

          case 'Choices':
            return (
              <div key={idx} className="border rounded-lg p-4 bg-muted/30">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-3">
                  <ListChecks className="h-4 w-4" />
                  <span>Choices: {el.name || 'choice'}</span>
                  {el.toName && <span className="text-xs">→ {el.toName}</span>}
                </div>
                <div className="space-y-2">
                  {el.choices?.map((choice, i) => (
                    <label
                      key={i}
                      className="flex items-center gap-3 p-2 rounded border bg-white hover:bg-accent/50 cursor-pointer transition-colors"
                    >
                      <input type="radio" name={`preview-${el.name}-${idx}`} className="accent-primary" />
                      <span className="text-sm flex-1">{choice}</span>
                      {el.hotkeys?.[choice] && (
                        <kbd className="px-2 py-0.5 bg-muted rounded text-xs font-mono">
                          {el.hotkeys[choice]}
                        </kbd>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            );

          case 'RectangleLabels':
          case 'PolygonLabels':
          case 'BrushLabels':
          case 'Labels':
            return (
              <div key={idx} className="border rounded-lg p-4 bg-muted/30">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-3">
                  <ListChecks className="h-4 w-4" />
                  <span>{el.type}: {el.name || 'label'}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {el.labels?.map((label, i) => (
                    <button
                      key={i}
                      className="px-3 py-1.5 rounded border bg-white hover:bg-primary hover:text-white text-sm transition-colors"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}

export function LabelingSetupTab({
  formData,
  updateFormData,
}: LabelingSetupTabProps) {
  const [showPreview, setShowPreview] = useState(true);

  const parsed = useMemo(() => {
    return parseXMLConfig(formData.labelConfig);
  }, [formData.labelConfig]);

  const defaultConfig = `<View>
  <Image name="image" value="$image"/>
  <Choices name="choice" toName="image">
    <Choice value="Cat" hotkey="1"/>
    <Choice value="Dog" hotkey="2"/>
  </Choices>
</View>`;

  return (
    <div className="flex flex-col">
      <div className="p-6 border-b shrink-0">
        <h3 className="text-lg font-semibold mb-2">Labeling Interface</h3>
        <p className="text-sm text-muted-foreground">
          Define your labeling interface using Label Studio's XML configuration format.
        </p>
      </div>

      <div className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Code className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-medium">Label Configuration (XML)</h4>
          {formData.labelConfig && (
            <div className="ml-auto flex items-center gap-1.5">
              {parsed.valid ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-xs text-green-600">Valid</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-xs text-red-600">{parsed.error || 'Invalid'}</span>
                </>
              )}
            </div>
          )}
        </div>

        <div className={cn(
          "grid gap-4",
          showPreview ? "grid-cols-2" : "grid-cols-1"
        )}>
          {/* Code Editor */}
          <div className="space-y-3">
            <Textarea
              placeholder={defaultConfig}
              value={formData.labelConfig}
              onChange={(e) => updateFormData({ labelConfig: e.target.value })}
              rows={16}
              className="font-mono text-sm resize-none"
            />

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  // Validate is already happening via parsed state
                  if (!formData.labelConfig) {
                    updateFormData({ labelConfig: defaultConfig });
                  }
                }}
              >
                {!formData.labelConfig ? 'Use Example Config' : 'Validate Configuration'}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? 'Hide Preview' : 'Show Preview'}
              </Button>
            </div>
          </div>

          {/* Preview Panel */}
          {showPreview && (
            <div className="border rounded-lg bg-card">
              <div className="px-4 py-3 border-b bg-muted/30">
                <h4 className="text-sm font-medium">Preview</h4>
              </div>
              <div className="p-4 max-h-[400px] overflow-y-auto">
                <LabelPreview elements={parsed.elements} />
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground mt-4">
          Supported elements: View, Image, Text, Header, HyperText, Choices, Choice,
          RectangleLabels, PolygonLabels, BrushLabels, Labels, Label
        </p>
      </div>
    </div>
  );
}

import type { TaskData } from '@/types';

// Parsed elements from Label Studio XML config
export interface LabelConfigElement {
  type: 'View' | 'Text' | 'Image' | 'HyperText' | 'Choices' | 'Choice' | 'Labels' | 'Label' | 'Header' | 'Taxonomy' | 'TextArea' | 'Style' | 'Unknown';
  name?: string;
  value?: string;
  toName?: string;
  style?: Record<string, string>;
  children?: LabelConfigElement[];
  attributes?: Record<string, string>;
  /** Text content of leaf elements (e.g. the label inside <Choice value="$brand">Confirm Prediction</Choice>) */
  textContent?: string;
}

export interface ParsedLabelConfig {
  elements: LabelConfigElement[];
  choices: { name: string; toName: string; choices: string[] }[];
  labels: { name: string; toName: string; labels: string[] }[];
  dataFields: string[]; // Variable names like $product_name
}

/**
 * Parse CSS style string into object
 */
function parseStyle(styleStr: string): Record<string, string> {
  const style: Record<string, string> = {};
  if (!styleStr) return style;

  styleStr.split(';').forEach((part) => {
    const [key, value] = part.split(':').map((s) => s.trim());
    if (key && value) {
      // Convert CSS kebab-case to camelCase
      const camelKey = key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      style[camelKey] = value;
    }
  });

  return style;
}

/**
 * Extract variable name from value like "$product_name"
 */
function extractVariableName(value: string): string | null {
  if (value && value.startsWith('$')) {
    return value.slice(1);
  }
  return null;
}

/**
 * Parse a single XML element
 */
function parseElement(element: Element): LabelConfigElement {
  const tagName = element.tagName;
  const attributes: Record<string, string> = {};

  // Extract all attributes
  for (const attr of Array.from(element.attributes)) {
    attributes[attr.name] = attr.value;
  }

  const parsed: LabelConfigElement = {
    type: getElementType(tagName),
    attributes,
  };

  if (attributes.name) parsed.name = attributes.name;
  if (attributes.value) parsed.value = attributes.value;
  if (attributes.toName) parsed.toName = attributes.toName;
  if (attributes.style) parsed.style = parseStyle(attributes.style);

  // Capture text content for leaf elements (elements with no element children)
  if (element.children.length === 0) {
    const text = element.textContent?.trim();
    if (text) parsed.textContent = text;
  }

  // Parse children
  const children: LabelConfigElement[] = [];
  for (const child of Array.from(element.children)) {
    children.push(parseElement(child));
  }
  if (children.length > 0) {
    parsed.children = children;
  }

  return parsed;
}

function getElementType(tagName: string): LabelConfigElement['type'] {
  const types: Record<string, LabelConfigElement['type']> = {
    View: 'View',
    Text: 'Text',
    Image: 'Image',
    HyperText: 'HyperText',
    Choices: 'Choices',
    Choice: 'Choice',
    Labels: 'Labels',
    Label: 'Label',
    Header: 'Header',
    Taxonomy: 'Taxonomy',
    TextArea: 'TextArea',
    Style: 'Style',
  };
  return types[tagName] || 'Unknown';
}

/**
 * Extract all variable names from the config
 */
function extractDataFields(elements: LabelConfigElement[]): string[] {
  const fields = new Set<string>();

  function traverse(element: LabelConfigElement) {
    if (element.value) {
      const varName = extractVariableName(element.value);
      if (varName) fields.add(varName);
    }
    if (element.attributes) {
      Object.values(element.attributes).forEach((val) => {
        const match = val.match(/\$([a-zA-Z_][a-zA-Z0-9_]*)/g);
        if (match) {
          match.forEach((m) => fields.add(m.slice(1)));
        }
      });
    }
    element.children?.forEach(traverse);
  }

  elements.forEach(traverse);
  return Array.from(fields);
}

/**
 * Extract choices configurations
 */
function extractChoices(elements: LabelConfigElement[]): ParsedLabelConfig['choices'] {
  const choices: ParsedLabelConfig['choices'] = [];

  function traverse(element: LabelConfigElement) {
    if (element.type === 'Choices' && element.name) {
      const choiceValues: string[] = [];
      element.children?.forEach((child) => {
        if (child.type === 'Choice' && child.value) {
          choiceValues.push(child.value);
        }
      });
      choices.push({
        name: element.name,
        toName: element.toName || '',
        choices: choiceValues,
      });
    }
    element.children?.forEach(traverse);
  }

  elements.forEach(traverse);
  return choices;
}

/**
 * Extract labels configurations
 */
function extractLabels(elements: LabelConfigElement[]): ParsedLabelConfig['labels'] {
  const labels: ParsedLabelConfig['labels'] = [];

  function traverse(element: LabelConfigElement) {
    if (element.type === 'Labels' && element.name) {
      const labelValues: string[] = [];
      element.children?.forEach((child) => {
        if (child.type === 'Label' && child.value) {
          labelValues.push(child.value);
        }
      });
      labels.push({
        name: element.name,
        toName: element.toName || '',
        labels: labelValues,
      });
    }
    element.children?.forEach(traverse);
  }

  elements.forEach(traverse);
  return labels;
}

/**
 * Parse Label Studio XML config string
 */
export function parseLabelConfig(xmlString: string): ParsedLabelConfig | null {
  if (!xmlString || !xmlString.trim()) {
    return null;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'text/xml');

    // Check for parse errors
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      console.error('XML parse error:', parseError.textContent);
      return null;
    }

    const elements: LabelConfigElement[] = [];
    for (const child of Array.from(doc.children)) {
      elements.push(parseElement(child));
    }

    return {
      elements,
      choices: extractChoices(elements),
      labels: extractLabels(elements),
      dataFields: extractDataFields(elements),
    };
  } catch (error) {
    console.error('Failed to parse label config:', error);
    return null;
  }
}

/**
 * Substitute variables in a string with task data
 */
export function substituteVariables(template: string, data: TaskData): string {
  if (!template) return '';

  return template.replace(/\$([a-zA-Z_][a-zA-Z0-9_]*)/g, (match, varName) => {
    const value = data[varName];
    if (value === undefined || value === null) return '';
    return String(value);
  });
}

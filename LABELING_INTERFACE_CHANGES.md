# Labeling Interface — Full XML Template Rendering

## What Was Built

The annotation panel now renders **everything** defined in a project's XML labeling template — all sections, all field types, all interactive controls — instead of only the first `<Choices>` group.

---

## Problem

For the **"Test project Image descriptions"** project (and any complex project), the XML template defines 6 sections:

1. Image & Title Validation
2. Category & Product Type Assignment
3. Brand Identification
4. Attribute Extraction (Color, Flavor, Scent, Code, Size)
5. Compliance & Composition (Country of Origin, Dietary Restrictions, Fat, Strength, Age Group)
6. Measurements & Units

Previously, only the **first `<Choices>` group** (`product_type_labeled`) was rendered. All other sections were invisible.

---

## Architecture

### Mode Detection

- **Template mode**: Project has an XML labeling config (`labelingTemplates[0].config.xml`) → full XML form rendered
- **Simple mode**: No XML config → existing behavior (TaskDataDisplay + ChoicesControl + ReasoningControl)

### Data Flow

```
XML string (DB)
  → parseLabelConfig() in LabelingInterface.tsx
  → labelConfig: ParsedLabelConfig passed to AnnotationPanel
  → FullTemplateForm renders all XML elements recursively
  → User fills fields → onChange(name, value) updates templateValues state
  → handleSubmit → buildResultFromElements() → result array → POST /api/.../annotate
```

### State

`templateValues: Record<string, string | string[]>` in `LabelingInterface.tsx`:
- Single-choice fields: `templateValues["product_type_labeled"] = "Electronics"`
- Multi-choice fields: `templateValues["dietary_restrictions_labeled"] = ["gluten_free", "vegan"]`
- TextArea fields: `templateValues["brand_labeled"] = "Coca-Cola"`

---

## Files Changed

### `webapp/src/lib/labelConfigParser.ts`

- Added `'TextArea' | 'Taxonomy' | 'Style'` to `LabelConfigElement.type` union
- Added `textContent?: string` field — captures text inside leaf elements
  - Example: `<Choice value="$brand">Confirm Prediction</Choice>` → `textContent = "Confirm Prediction"`
- Updated `getElementType()` to map the new tag names
- Updated `parseElement()` to capture `element.textContent` for leaf elements (no child elements)

### `webapp/src/types/index.ts`

- `AnnotationResult.value` updated: `{ choices?: string[]; text?: string }` (was `{ choices: string[] }`)
- Supports both `choices` (for Choices/Taxonomy results) and `text` (for TextArea results)

### `backend/src/routes/projects.ts` — annotate route

- Now accepts `result?: object[]` in the request body
- If `result` is provided and non-empty → uses it directly (template mode)
- Otherwise → builds result from `choice` + `reasoning` fields (simple mode, backwards-compatible)

### `webapp/src/components/labeling/AnnotationPanel.tsx` — major rewrite

New props added:
```typescript
labelConfig?: ParsedLabelConfig | null;
templateValues?: Record<string, string | string[]>;
onTemplateChange?: (name: string, value: string | string[]) => void;
```

New components:
- **`SingleChoicesField`** — radio buttons for `choice="single"` without layout
- **`MultipleChoicesField`** — checkboxes for `choice="multiple"` without layout
- **`SelectSingleField`** — native `<select>` for `choice="single" layout="select"` (country list, units)
- **`SelectMultipleField`** — searchable checkbox list for `choice="multiple" layout="select"` (dietary restrictions)
- **`TaxonomyFormField`** — flat searchable list of all leaf choices from `<Taxonomy>`
- **`ChoicesFormField`** — dispatcher that picks the right control based on `choice` + `layout` attributes
- **`TextAreaFormField`** — `<textarea>` for `<TextArea>` elements
- **`RenderFormElement`** — recursive element renderer (handles all element types)
- **`FullTemplateForm`** — root renderer, iterates `config.elements`

Element rendering:
| XML Element | Rendered As |
|---|---|
| `<Header>` | Section header (numbered ones get highlighted style) |
| `<Text>` | Info text with `$variable` substitution |
| `<HyperText>` | Raw HTML (links, etc.) |
| `<Choices choice="single">` | Radio buttons |
| `<Choices choice="single" layout="select">` | `<select>` dropdown |
| `<Choices choice="multiple">` | Checkboxes |
| `<Choices choice="multiple" layout="select">` | Searchable checkbox list |
| `<TextArea>` | `<textarea>` input |
| `<Taxonomy>` | Flat searchable leaf-choice list |
| `<Image>` | **Skipped** (shown in right panel) |
| `<Style>` | **Skipped** (CSS only) |
| `<View>` | Container (renders children, strips layout CSS) |

Choice value substitution:
- `<Choice value="$brand">Confirm Prediction</Choice>` → value substituted with actual task data; label shown is "Confirm Prediction"
- `<Choice value="newborn_0_3_months" alias="Newborn (0-3 months)"/>` → label shown is alias

### `webapp/src/pages/LabelingInterface.tsx` — significant update

New state:
```typescript
const [templateValues, setTemplateValues] = useState<TemplateValues>({});
```

New computed value:
```typescript
const labelConfig = useMemo(() => parseLabelConfig(xml), [backendProject]);
```

New helpers:
- **`buildResultFromElements(elements, values)`** — walks XML tree, builds `AnnotationResult[]` from `templateValues`
- **`templateValuesFromResult(result)`** — reverse: loads existing annotation into `templateValues` on task switch

Updated `handleSubmit`:
- Template mode: calls `buildResultFromElements()`, POSTs `{ result, comment, status }`
- Simple mode: POSTs `{ choice, reasoning, comment, status }` (unchanged)

Updated `canSubmit`:
- Template mode: `Object.values(templateValues).some(v => v !== '' && ...)`
- Simple mode: `selectedChoice !== null`

Updated per-task reset effect (runs on `currentTaskId` or `annotationsSeeded` change):
- Also resets `templateValues` from existing annotation or to `{}`

Updated keyboard shortcuts:
- `SELECT` tag added to the ignore list (prevents shortcuts firing in dropdowns)
- Number shortcuts (1-N) disabled in template mode

---

## Result Format

Template annotations are stored as a full result array:

```json
[
  { "type": "choices", "from_name": "product_type_labeled", "to_name": "product_image", "value": { "choices": ["Electronics"] } },
  { "type": "choices", "from_name": "generic_name_verify", "to_name": "product_image", "value": { "choices": ["Cola Zero"] } },
  { "type": "textarea", "from_name": "generic_name_labeled", "to_name": "product_image", "value": { "text": "Cola Zero corrected" } },
  { "type": "choices", "from_name": "country_of_origin_labeled", "to_name": "product_image", "value": { "choices": ["de,Germany"] } },
  { "type": "choices", "from_name": "dietary_restrictions_labeled", "to_name": "product_image", "value": { "choices": ["gluten_free", "vegan"] } }
]
```

On reload, `templateValuesFromResult()` maps this back into the form state so previous annotations are pre-filled.

---

## Projects Using Template Mode

All projects with XML in their `labelingTemplates[0].config.xml`:
- **Test project 1** / **test project** — query relevance + taxonomy reasoning
- **Test project query classification** — simple query type labeling
- **Test project QC image** — image centering check
- **Test project Image descriptions** — full 6-section product labeling form

Projects **without** XML use simple mode (fallback choices).

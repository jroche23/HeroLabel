# Quick Start Guide for Frontend Integration

## Backend is Ready!

The Label Studio backend is fully implemented and running. Here's everything you need to integrate it.

## API Base URL

```typescript
const API_BASE = process.env.VITE_BACKEND_URL; // Already configured
```

## Step 1: Import Types

```typescript
import type {
  Project,
  CreateProjectRequest,
  LabelingTemplate,
  DataImport,
  PresetTemplate,
} from '@/backend/src/types';
```

## Step 2: Get Preset Templates (No Auth)

```typescript
// This works immediately, no authentication needed
const presets = await api.get<PresetTemplate[]>(
  '/api/projects/templates/presets'
);

// Returns 6 presets:
// - Image Captioning
// - Image Classification
// - Object Detection
// - Text Classification
// - Named Entity Recognition
// - Audio Classification
```

## Step 3: Authenticate User

Use Better Auth for authentication (already configured):

```typescript
// Sign in with email
await authClient.signIn.email({
  email: userEmail,
});

// User receives OTP via email
// Submit OTP to complete authentication
// Session cookie is automatically set
```

## Step 4: Create Project

```typescript
const project = await api.post<Project>('/api/projects', {
  title: 'My First Project',
  description: 'Optional description',
  workspace: 'Optional workspace name',
});

// Returns:
// {
//   id: "clx123...",
//   title: "My First Project",
//   description: "Optional description",
//   workspace: "Optional workspace name",
//   createdAt: "2026-02-07T...",
//   updatedAt: "2026-02-07T...",
//   userId: "user-123"
// }
```

## Step 5: Add Labeling Template

```typescript
const template = await api.post<LabelingTemplate>(
  `/api/projects/${project.id}/template`,
  {
    name: 'Product Categories',
    type: 'image_classification',
    config: {
      interfaceType: 'classification',
      labels: ['Electronics', 'Clothing', 'Home Goods'],
      multiSelect: false,
    },
  }
);
```

## Step 6: Add Data Import

```typescript
const dataImport = await api.post<DataImport>(
  `/api/projects/${project.id}/import`,
  {
    sourceType: 'url',
    sourceUrl: 'https://example.com/dataset.json',
    fileType: 'json',
  }
);

// Status will be 'pending' initially
// Later you can poll to check if it's 'completed'
```

## Step 7: List All Projects

```typescript
const projects = await api.get<Project[]>('/api/projects');
```

## Step 8: Get Project Details

```typescript
// This includes templates and imports
const projectWithDetails = await api.get<
  Project & {
    labelingTemplates: LabelingTemplate[];
    dataImports: DataImport[];
  }
>(`/api/projects/${project.id}`);
```

## Step 9: Update Project

```typescript
const updated = await api.put<Project>(`/api/projects/${project.id}`, {
  title: 'Updated Project Name',
  description: 'New description',
});
```

## Step 10: Delete Project

```typescript
// This also deletes all templates and imports (cascade)
await api.delete(`/api/projects/${project.id}`);
```

## Template Config Examples

### Image Classification
```typescript
{
  name: 'Animal Classifier',
  type: 'image_classification',
  config: {
    interfaceType: 'classification',
    labels: ['Cat', 'Dog', 'Bird', 'Fish'],
    multiSelect: false, // or true for multi-label
  }
}
```

### Image Captioning
```typescript
{
  name: 'Image Descriptions',
  type: 'image_captioning',
  config: {
    interfaceType: 'captioning',
    fields: [{
      name: 'caption',
      type: 'textarea',
      label: 'Caption',
      placeholder: 'Describe what you see...',
    }]
  }
}
```

### Object Detection
```typescript
{
  name: 'Object Detector',
  type: 'object_detection',
  config: {
    interfaceType: 'bounding_box',
    labels: ['Person', 'Car', 'Tree', 'Building'],
    showLabels: true,
  }
}
```

### Named Entity Recognition
```typescript
{
  name: 'NER Tagger',
  type: 'named_entity_recognition',
  config: {
    interfaceType: 'ner',
    entities: [
      { name: 'Person', color: '#FF6B6B' },
      { name: 'Organization', color: '#4ECDC4' },
      { name: 'Location', color: '#45B7D1' },
    ]
  }
}
```

## Error Handling

```typescript
try {
  const project = await api.post('/api/projects', data);
} catch (error) {
  // Error format: { error: { message: string, code: string } }
  if (error.code === 'UNAUTHORIZED') {
    // Redirect to login
  } else if (error.code === 'NOT_FOUND') {
    // Show "not found" message
  }
}
```

## Important Notes

1. **API Envelope:** The API returns `{ data: ... }` but your API client automatically unwraps it
2. **Authentication:** All endpoints except `/templates/presets` require authentication
3. **Ownership:** Users can only access their own projects
4. **Cascade Delete:** Deleting a project deletes all its templates and imports
5. **Type Safety:** All types are shared between backend and frontend

## Testing the Backend

You can test the backend directly with cURL:

```bash
# Health check
curl $BACKEND_URL/health

# Get presets (no auth)
curl $BACKEND_URL/api/projects/templates/presets

# Create project (requires auth cookie)
curl -X POST $BACKEND_URL/api/projects \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=YOUR_TOKEN" \
  -d '{"title":"Test Project"}'
```

## Need Help?

- **API Documentation:** `/home/user/workspace/backend/API_DOCUMENTATION.md`
- **Type Definitions:** `/home/user/workspace/backend/src/types.ts`
- **Implementation Details:** `/home/user/workspace/backend/README_IMPLEMENTATION.md`

---

**Everything is ready to go!** Start building the UI and call these APIs. 🚀

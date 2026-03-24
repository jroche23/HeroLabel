# Label Studio Backend API Documentation

## Overview

The Label Studio backend provides a complete REST API for managing labeling projects, templates, and data imports. All endpoints use JSON for request and response bodies and follow the standard `{ data: ... }` envelope pattern.

## Base URL

```
$BACKEND_URL/api
```

## Authentication

All endpoints (except `/templates/presets`) require authentication via Better Auth session cookies. The session cookie is automatically set when users sign in through the authentication flow.

Cookie format:
```
Cookie: better-auth.session_token=<session_token>
```

## API Endpoints

### Preset Templates

#### GET /projects/templates/presets

Get a list of preset labeling templates that users can choose from when setting up a new project.

**Authentication:** Not required

**Response:**
```json
{
  "data": [
    {
      "id": "preset-image-captioning",
      "name": "Image Captioning",
      "type": "image_captioning",
      "description": "Add text descriptions to images",
      "config": {
        "interfaceType": "captioning",
        "fields": [
          {
            "name": "caption",
            "type": "textarea",
            "label": "Caption",
            "placeholder": "Describe the image..."
          }
        ]
      }
    }
    // ... more presets
  ]
}
```

**Example:**
```bash
curl -X GET $BACKEND_URL/api/projects/templates/presets
```

---

### Projects

#### POST /projects

Create a new labeling project.

**Authentication:** Required

**Request Body:**
```json
{
  "title": "string (required, max 255)",
  "description": "string (optional)",
  "workspace": "string (optional)"
}
```

**Response:** `201 Created`
```json
{
  "data": {
    "id": "clx123...",
    "title": "My Project",
    "description": "Project description",
    "workspace": "Default",
    "createdAt": "2026-02-07T14:30:00.000Z",
    "updatedAt": "2026-02-07T14:30:00.000Z",
    "userId": "user-123"
  }
}
```

**Example:**
```bash
curl -X POST $BACKEND_URL/api/projects \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=<your_token>" \
  -d '{
    "title": "Image Labeling Project",
    "description": "A project for labeling product images",
    "workspace": "E-commerce"
  }'
```

---

#### GET /projects

List all projects for the authenticated user.

**Authentication:** Required

**Response:**
```json
{
  "data": [
    {
      "id": "clx123...",
      "title": "My Project",
      "description": "Project description",
      "workspace": "Default",
      "createdAt": "2026-02-07T14:30:00.000Z",
      "updatedAt": "2026-02-07T14:30:00.000Z",
      "userId": "user-123"
    }
    // ... more projects
  ]
}
```

**Example:**
```bash
curl -X GET $BACKEND_URL/api/projects \
  -H "Cookie: better-auth.session_token=<your_token>"
```

---

#### GET /projects/:id

Get a single project with all its labeling templates and data imports.

**Authentication:** Required

**Path Parameters:**
- `id` - Project ID

**Response:**
```json
{
  "data": {
    "id": "clx123...",
    "title": "My Project",
    "description": "Project description",
    "workspace": "Default",
    "createdAt": "2026-02-07T14:30:00.000Z",
    "updatedAt": "2026-02-07T14:30:00.000Z",
    "userId": "user-123",
    "labelingTemplates": [
      {
        "id": "clt456...",
        "projectId": "clx123...",
        "name": "Image Classification",
        "type": "image_classification",
        "config": {
          "interfaceType": "classification",
          "labels": ["Cat", "Dog", "Bird"],
          "multiSelect": false
        },
        "isPreset": false,
        "createdAt": "2026-02-07T14:31:00.000Z",
        "updatedAt": "2026-02-07T14:31:00.000Z"
      }
    ],
    "dataImports": [
      {
        "id": "cld789...",
        "projectId": "clx123...",
        "sourceType": "url",
        "sourceUrl": "https://example.com/data.json",
        "fileName": null,
        "fileType": "json",
        "status": "completed",
        "createdAt": "2026-02-07T14:32:00.000Z",
        "updatedAt": "2026-02-07T14:32:00.000Z"
      }
    ]
  }
}
```

**Example:**
```bash
curl -X GET $BACKEND_URL/api/projects/clx123... \
  -H "Cookie: better-auth.session_token=<your_token>"
```

---

#### PUT /projects/:id

Update an existing project.

**Authentication:** Required

**Path Parameters:**
- `id` - Project ID

**Request Body:**
```json
{
  "title": "string (optional, max 255)",
  "description": "string (optional)",
  "workspace": "string (optional)"
}
```

**Response:**
```json
{
  "data": {
    "id": "clx123...",
    "title": "Updated Project Title",
    "description": "Updated description",
    "workspace": "Updated Workspace",
    "createdAt": "2026-02-07T14:30:00.000Z",
    "updatedAt": "2026-02-07T14:35:00.000Z",
    "userId": "user-123"
  }
}
```

**Example:**
```bash
curl -X PUT $BACKEND_URL/api/projects/clx123... \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=<your_token>" \
  -d '{
    "title": "Updated Project Title",
    "description": "Updated description"
  }'
```

---

#### DELETE /projects/:id

Delete a project and all its associated data (templates, imports).

**Authentication:** Required

**Path Parameters:**
- `id` - Project ID

**Response:** `204 No Content`

**Example:**
```bash
curl -X DELETE $BACKEND_URL/api/projects/clx123... \
  -H "Cookie: better-auth.session_token=<your_token>"
```

---

### Data Imports

#### POST /projects/:id/import

Add a data import to a project.

**Authentication:** Required

**Path Parameters:**
- `id` - Project ID

**Request Body:**
```json
{
  "sourceType": "file | url (required)",
  "sourceUrl": "string (optional, required if sourceType is url)",
  "fileName": "string (optional)",
  "fileType": "string (optional)"
}
```

**Response:** `201 Created`
```json
{
  "data": {
    "id": "cld789...",
    "projectId": "clx123...",
    "sourceType": "url",
    "sourceUrl": "https://example.com/images.zip",
    "fileName": null,
    "fileType": "zip",
    "status": "pending",
    "createdAt": "2026-02-07T14:40:00.000Z",
    "updatedAt": "2026-02-07T14:40:00.000Z"
  }
}
```

**Example:**
```bash
curl -X POST $BACKEND_URL/api/projects/clx123.../import \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=<your_token>" \
  -d '{
    "sourceType": "url",
    "sourceUrl": "https://example.com/dataset.json",
    "fileType": "json"
  }'
```

---

### Labeling Templates

#### POST /projects/:id/template

Add a labeling template to a project.

**Authentication:** Required

**Path Parameters:**
- `id` - Project ID

**Request Body:**
```json
{
  "name": "string (required, max 255)",
  "type": "image_captioning | image_classification | object_detection | text_classification | named_entity_recognition | audio_classification | video_classification | custom (required)",
  "config": "object (required) - Template configuration",
  "isPreset": "boolean (optional, default: false)"
}
```

**Response:** `201 Created`
```json
{
  "data": {
    "id": "clt456...",
    "projectId": "clx123...",
    "name": "Product Classification",
    "type": "image_classification",
    "config": {
      "interfaceType": "classification",
      "labels": ["Electronics", "Clothing", "Home Goods", "Toys"],
      "multiSelect": false
    },
    "isPreset": false,
    "createdAt": "2026-02-07T14:45:00.000Z",
    "updatedAt": "2026-02-07T14:45:00.000Z"
  }
}
```

**Example:**
```bash
curl -X POST $BACKEND_URL/api/projects/clx123.../template \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=<your_token>" \
  -d '{
    "name": "Product Classification",
    "type": "image_classification",
    "config": {
      "interfaceType": "classification",
      "labels": ["Electronics", "Clothing", "Home Goods", "Toys"],
      "multiSelect": false
    }
  }'
```

---

## Template Types

The API supports the following labeling template types:

- `image_captioning` - Add text descriptions to images
- `image_classification` - Classify images into predefined categories
- `object_detection` - Draw bounding boxes around objects in images
- `text_classification` - Classify text into predefined categories
- `named_entity_recognition` - Identify and label entities in text
- `audio_classification` - Classify audio clips into categories
- `video_classification` - Classify video clips into categories
- `custom` - Custom labeling interface

Each template type has its own `config` structure that defines the labeling interface and options.

---

## Data Import Status

Data imports progress through the following statuses:

- `pending` - Import has been created but not yet processed
- `processing` - Import is currently being processed
- `completed` - Import completed successfully
- `failed` - Import failed (check logs for details)

---

## Error Responses

All error responses follow this format:

```json
{
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE"
  }
}
```

Common error codes:
- `UNAUTHORIZED` (401) - No valid session token provided
- `NOT_FOUND` (404) - Resource not found or doesn't belong to user
- `VALIDATION_ERROR` (400) - Request body validation failed

---

## TypeScript Types

All request and response types are defined in `/home/user/workspace/backend/src/types.ts` and can be imported by both the backend and frontend for type safety:

```typescript
import {
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
  LabelingTemplate,
  CreateLabelingTemplateRequest,
  DataImport,
  CreateDataImportRequest,
  PresetTemplate,
} from '@/backend/src/types';
```

---

## Implementation Files

- **Prisma Schema:** `/home/user/workspace/backend/prisma/schema.prisma`
- **Type Definitions:** `/home/user/workspace/backend/src/types.ts`
- **API Routes:** `/home/user/workspace/backend/src/routes/projects.ts`
- **Auth Configuration:** `/home/user/workspace/backend/src/auth.ts`
- **Main Entry:** `/home/user/workspace/backend/src/index.ts`

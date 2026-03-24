# Data Management API Documentation

Complete system for parsing uploaded data files and dynamically displaying columns in the Data Manager.

## Overview

This system allows you to:
- Upload CSV, TSV, or JSON data files
- Automatically detect column types (text, number, boolean, date, json)
- Manage column visibility and ordering
- View and edit task data with dynamic columns
- Paginate through large datasets

## Database Schema

### TaskData Model
Stores parsed data for each task with its column schema.

```prisma
model TaskData {
  id           String   @id @default(cuid())
  taskId       String   @unique
  task         Task     @relation(...)
  data         String   // JSON string containing the raw data row
  columnSchema String   // JSON array of column definitions
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

### DataColumn Model
Stores column definitions and display preferences per project.

```prisma
model DataColumn {
  id          String   @id @default(cuid())
  projectId   String
  name        String   // actual column name from data
  type        String   // text, number, boolean, date, json
  displayName String   // user-friendly name
  visible     Boolean  @default(true)
  order       Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Updated Task Model
Added relationship to TaskData.

```prisma
model Task {
  // ... existing fields ...
  taskData    TaskData?
}
```

## File Parser Utilities

Location: `/home/user/workspace/backend/src/utils/fileParser.ts`

### Supported Formats
- CSV (comma-separated values)
- TSV (tab-separated values)
- JSON (array of objects)

### Column Type Detection
Automatically infers column types from data:
- **text**: Default for string data
- **number**: Numeric values (integers and floats)
- **boolean**: true/false, yes/no, 1/0
- **date**: ISO dates, YYYY-MM-DD, MM/DD/YYYY formats
- **json**: Objects, arrays, or JSON strings

### Example Usage

```typescript
import { parseCSV, parseTSV, parseJSON } from "./utils/fileParser";

// Parse CSV
const { rows, columns } = parseCSV(csvContent);

// Parse TSV
const { rows, columns } = parseTSV(tsvContent);

// Parse JSON
const { rows, columns } = parseJSON(jsonContent);

// Example column definition:
{
  name: "product_name",
  type: "text",
  displayName: "Product Name"
}
```

## API Endpoints

All endpoints require authentication. Use Better Auth session cookies.

### 1. Upload Data File

Upload and parse a data file, creating tasks for each row.

**Endpoint:** `POST /api/projects/:projectId/data/upload`

**Request Body:**
```json
{
  "fileContent": "column1,column2\nvalue1,value2",
  "fileType": "csv",
  "fileName": "data.csv"
}
```

**Response:**
```json
{
  "data": {
    "taskCount": 100,
    "columnCount": 13,
    "columns": [
      {
        "id": "col123",
        "projectId": "proj123",
        "name": "product_name",
        "type": "text",
        "displayName": "Product Name",
        "visible": true,
        "order": 0,
        "createdAt": "2024-01-15T10:00:00Z",
        "updatedAt": "2024-01-15T10:00:00Z"
      }
    ],
    "sampleData": [
      {
        "product_name": "Pasta Primavera",
        "price": "12.99"
      }
    ]
  }
}
```

### 2. Get Column Definitions

Get all column definitions for a project.

**Endpoint:** `GET /api/projects/:projectId/columns`

**Response:**
```json
{
  "data": [
    {
      "id": "col123",
      "projectId": "proj123",
      "name": "product_name",
      "type": "text",
      "displayName": "Product Name",
      "visible": true,
      "order": 0,
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

### 3. Update Column

Update column visibility, order, or display name.

**Endpoint:** `PUT /api/projects/:projectId/columns/:columnId`

**Request Body:**
```json
{
  "visible": false,
  "order": 5,
  "displayName": "Custom Name"
}
```

**Response:**
```json
{
  "data": {
    "id": "col123",
    "projectId": "proj123",
    "name": "product_name",
    "type": "text",
    "displayName": "Custom Name",
    "visible": false,
    "order": 5,
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  }
}
```

### 4. Reorder Columns

Reorder multiple columns at once.

**Endpoint:** `POST /api/projects/:projectId/columns/reorder`

**Request Body:**
```json
{
  "columnIds": ["col3", "col1", "col2"]
}
```

**Response:**
```json
{
  "data": [
    // All columns in new order
  ]
}
```

### 5. Get Tasks with Data

Get paginated tasks with dynamic column data.

**Endpoint:** `GET /api/projects/:projectId/tasks`

**Query Parameters:**
- `page` (default: 1)
- `pageSize` (default: 50)
- `status` (optional: pending, in_progress, completed)

**Response:**
```json
{
  "data": {
    "tasks": [
      {
        "id": "task123",
        "projectId": "proj123",
        "status": "pending",
        "assignedTo": null,
        "assignedUser": null,
        "data": {
          "product_name": "Pasta Primavera",
          "price": "12.99",
          "in_stock": "true"
        },
        "createdAt": "2024-01-15T10:00:00Z",
        "updatedAt": "2024-01-15T10:00:00Z"
      }
    ],
    "columns": [
      // Column definitions
    ],
    "pagination": {
      "page": 1,
      "pageSize": 50,
      "total": 100,
      "totalPages": 2
    }
  }
}
```

### 6. Update Task Data

Update the data for a specific task.

**Endpoint:** `PUT /api/projects/:projectId/tasks/:taskId`

**Request Body:**
```json
{
  "data": {
    "product_name": "Updated Name",
    "price": "15.99"
  }
}
```

**Response:**
```json
{
  "data": {
    "id": "task123",
    "projectId": "proj123",
    "status": "pending",
    "assignedTo": null,
    "assignedUser": null,
    "data": {
      "product_name": "Updated Name",
      "price": "15.99"
    },
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  }
}
```

### 7. Delete Task

Delete a task and its associated data.

**Endpoint:** `DELETE /api/projects/:projectId/tasks/:taskId`

**Response:**
```json
{
  "data": {
    "success": true
  }
}
```

## Zod Schemas

All request/response types are defined in `/home/user/workspace/backend/src/types.ts`:

```typescript
// Column type enum
export const columnTypeSchema = z.enum(["text", "number", "boolean", "date", "json"]);

// Column definition
export const columnDefinitionSchema = z.object({
  name: z.string(),
  type: columnTypeSchema,
  displayName: z.string(),
});

// Data column model
export const dataColumnSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string(),
  type: columnTypeSchema,
  displayName: z.string(),
  visible: z.boolean(),
  order: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Update column request
export const updateDataColumnSchema = z.object({
  visible: z.boolean().optional(),
  order: z.number().optional(),
  displayName: z.string().optional(),
});

// Reorder columns request
export const reorderColumnsSchema = z.object({
  columnIds: z.array(z.string()),
});

// Task with data
export const taskWithDataSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  status: taskStatusSchema,
  assignedTo: z.string().nullable(),
  assignedUser: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
  }).nullable().optional(),
  data: z.record(z.string(), z.any()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Paginated tasks response
export const paginatedTasksSchema = z.object({
  tasks: z.array(taskWithDataSchema),
  columns: z.array(dataColumnSchema),
  pagination: z.object({
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});
```

## Sample Data

Sample CSV with restaurant menu data:

```csv
agreement,annotation_id,annotator,confidence_score,created_at,cuisine_country_style,dietary_restriction,dish_course,dish_type,product_description,product_id,product_name,restaurant_name
yes,ANN001,john@example.com,0.95,2024-01-15T10:30:00Z,Italian,vegetarian,main,pasta,Delicious homemade pasta with fresh tomatoes,P001,Pasta Primavera,Bella Italia
yes,ANN002,jane@example.com,0.88,2024-01-15T11:00:00Z,Mexican,gluten-free,appetizer,tacos,Crispy corn tacos with authentic spices,P002,Street Tacos,Casa Mexico
```

## Testing

A test script is available at `/home/user/workspace/backend/test-parser.ts` that demonstrates all parser functionality:

```bash
cd /home/user/workspace/backend
bun run test-parser.ts
```

## Implementation Notes

1. **Column Type Inference**: The system samples up to 100 non-null values per column to infer types accurately.

2. **JSON Handling**: Nested JSON objects can be stored as JSON type columns, preserving their structure.

3. **Display Names**: Column names are automatically converted to user-friendly display names (e.g., "product_name" → "Product Name").

4. **Upsert Logic**: When uploading data to an existing project, columns are upserted (updated if they exist, created if new).

5. **Cascade Deletion**: Deleting a task automatically deletes its associated TaskData record via Prisma cascade.

6. **Pagination**: Large datasets are paginated with configurable page sizes (default: 50 rows).

## Error Handling

All endpoints return standard error responses:

```json
{
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE"
  }
}
```

Common error codes:
- `UNAUTHORIZED`: User not authenticated
- `NOT_FOUND`: Project or resource not found
- `INVALID_FILE`: File parsing failed
- `UPLOAD_FAILED`: File upload failed
- `UPDATE_FAILED`: Update operation failed

## Frontend Integration

To integrate with the frontend:

1. Import types from backend:
```typescript
import type {
  DataColumn,
  TaskWithData,
  PaginatedTasks
} from '../../backend/src/types';
```

2. Use the API client to call endpoints (ensure it auto-unwraps the `data` envelope).

3. Display columns dynamically based on the `columns` array and `visible` flag.

4. Implement column reordering UI using the reorder endpoint.

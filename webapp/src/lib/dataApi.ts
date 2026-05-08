import { api } from './api';
import type {
  DataColumn,
  UpdateDataColumnRequest,
  ReorderColumnsRequest,
  FileUploadResponse,
  PaginatedTasks,
  TaskWithData,
  UpdateTaskDataRequest,
} from '@/types/shared';

export const dataApi = {
  // File upload
  uploadDataFile: async (projectId: string, file: File): Promise<FileUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.raw(`/api/projects/${projectId}/data/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const json = await response.json().catch(() => null);
      throw new Error(json?.error?.message || `Upload failed with status ${response.status}`);
    }

    const json = await response.json();
    return json.data;
  },

  // Column management
  getColumns: (projectId: string) =>
    api.get<DataColumn[]>(`/api/projects/${projectId}/columns`),

  updateColumn: (projectId: string, columnId: string, data: UpdateDataColumnRequest) =>
    api.patch<DataColumn>(`/api/projects/${projectId}/columns/${columnId}`, data),

  reorderColumns: (projectId: string, data: ReorderColumnsRequest) =>
    api.post<DataColumn[]>(`/api/projects/${projectId}/columns/reorder`, data),

  // Task management with dynamic data
  getTasks: (projectId: string, page: number = 1, pageSize: number = 50) =>
    api.get<PaginatedTasks>(`/api/projects/${projectId}/tasks?page=${page}&pageSize=${pageSize}`),

  getTask: (projectId: string, taskId: string) =>
    api.get<TaskWithData>(`/api/projects/${projectId}/tasks/${taskId}`),

  updateTask: (projectId: string, taskId: string, data: UpdateTaskDataRequest) =>
    api.patch<TaskWithData>(`/api/projects/${projectId}/tasks/${taskId}`, data),

  deleteTask: (projectId: string, taskId: string) =>
    api.delete<void>(`/api/projects/${projectId}/tasks/${taskId}`),

  deleteTasks: (projectId: string, taskIds: string[]) =>
    api.post<void>(`/api/projects/${projectId}/tasks/bulk-delete`, { taskIds }),
};

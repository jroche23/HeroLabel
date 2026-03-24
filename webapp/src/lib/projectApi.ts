import { api } from './api';
import type {
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
  LabelingTemplate,
  DataImport,
  CreateDataImportRequest,
  CreateLabelingTemplateRequest,
  PresetTemplate,
} from '../../../backend/src/types';

export const projectApi = {
  // Project CRUD
  createProject: (data: CreateProjectRequest) =>
    api.post<Project>('/api/projects', data),

  listProjects: () =>
    api.get<Project[]>('/api/projects'),

  getProject: (id: string) =>
    api.get<Project & { templates: LabelingTemplate[]; imports: DataImport[] }>(`/api/projects/${id}`),

  updateProject: (id: string, data: UpdateProjectRequest) =>
    api.put<Project>(`/api/projects/${id}`, data),

  deleteProject: (id: string) =>
    api.delete<void>(`/api/projects/${id}`),

  // Data imports
  addDataImport: (projectId: string, data: CreateDataImportRequest) =>
    api.post<DataImport>(`/api/projects/${projectId}/import`, data),

  // Labeling templates
  addLabelingTemplate: (projectId: string, data: CreateLabelingTemplateRequest) =>
    api.post<LabelingTemplate>(`/api/projects/${projectId}/template`, data),

  // Preset templates
  getPresetTemplates: () =>
    api.get<PresetTemplate[]>('/api/projects/templates/presets'),
};

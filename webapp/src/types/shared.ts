// Shared types for frontend and backend communication
// This file contains only TypeScript type definitions (no runtime code)

// ==========================================
// Organization Member Management Types
// ==========================================

export type Role = "OWNER" | "ADMINISTRATOR" | "MANAGER" | "REVIEWER" | "ANNOTATOR";
export type MemberStatus = "active" | "inactive";
export type InvitationStatus = "pending" | "accepted" | "expired";

export interface RolePermissions {
  role: Role;
  permissions: {
    manageOrganization: boolean;
    manageAllWorkspaces: boolean;
    manageAllProjects: boolean;
    viewActivityLog: boolean;
    manageUsageAndLicense: boolean;
    viewUsageAndLicense: boolean;
    managePermissions: boolean;
    approveInvitations: boolean;
    manageAssignedWorkspaces: boolean;
    viewAllProjects: boolean;
    manageOwnProjects: boolean;
    reviewTasks: boolean;
    updateAnnotatedTasks: boolean;
    labelTasks: boolean;
    viewAllTasks: boolean;
    viewAssignedTasks: boolean;
    viewOwnTasks: boolean;
  };
}

export interface Organization {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: Role;
  status: MemberStatus;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
}

export interface MemberInvitation {
  id: string;
  organizationId: string;
  email: string;
  role: Role;
  invitedBy: string;
  status: InvitationStatus;
  token: string;
  expiresAt: string;
  createdAt: string;
  inviter?: {
    id: string;
    name: string;
    email: string;
  };
  organization?: {
    id: string;
    name: string;
  };
}

export interface CreateOrganizationRequest {
  name: string;
}

export interface InviteMemberRequest {
  email: string;
  role: Role;
}

export interface UpdateMemberRoleRequest {
  role: Role;
}

export interface UpdateMemberStatusRequest {
  status: MemberStatus;
}

// ==========================================
// Project Types
// ==========================================

export interface Project {
  id: string;
  title: string;
  description: string | null;
  workspace: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export interface CreateProjectRequest {
  title: string;
  description?: string;
  workspace?: string;
}

export interface UpdateProjectRequest {
  title?: string;
  description?: string;
  workspace?: string;
}

// ==========================================
// Project Member Types
// ==========================================

export type ProjectMemberRole = "OWNER" | "ADMINISTRATOR" | "MANAGER" | "REVIEWER" | "ANNOTATOR";

export interface ProjectMember {
  id: string;
  projectId: string;
  email: string;
  name: string;
  role: ProjectMemberRole;
  addedAt: string;
}

export interface AddProjectMemberRequest {
  email: string;
  name: string;
  role: ProjectMemberRole;
}

export interface UpdateProjectMemberRoleRequest {
  role: ProjectMemberRole;
}

// ==========================================
// Labeling Template Types
// ==========================================

export type LabelingTemplateType =
  | "image_captioning"
  | "image_classification"
  | "object_detection"
  | "text_classification"
  | "named_entity_recognition"
  | "audio_classification"
  | "video_classification"
  | "custom";

export interface LabelingTemplate {
  id: string;
  projectId: string;
  name: string;
  type: LabelingTemplateType;
  config: Record<string, any>;
  isPreset: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLabelingTemplateRequest {
  name: string;
  type: LabelingTemplateType;
  config: Record<string, any>;
  isPreset?: boolean;
}

// ==========================================
// Annotation Settings Types
// ==========================================

export type SkipQueue = "requeue_same" | "requeue_others" | "ignore";
export type TaskAssignment = "automatic" | "manual";

export interface AnnotationSettings {
  allowEmptyAnnotations: boolean;
  showDataManagerToAnnotators: boolean;
  allowSkipping: boolean;
  requireCommentToSkip: boolean;
  skipQueue: SkipQueue;
  usePredictionsToPreLabel: boolean;
  revealPreAnnotationsInteractively: boolean;
  showInstructionsBeforeLabeling: boolean;
  instructions: string;
  taskAssignment: TaskAssignment;
}

// ==========================================
// Review Settings Types
// ==========================================

export type RejectAction = "remove_from_queue" | "requeue_to_annotator" | "reviewer_decides";
export type ReviewedWhen = "one_accepted" | "all_reviewed";
export type TaskOrdering = "by_task_id" | "random";

export interface ReviewSettings {
  showInstructionsBeforeReviewing: boolean;
  reviewInstructions: string;
  rejectAction: RejectAction;
  requireCommentOnReject: boolean;
  showDataManagerToReviewers: boolean;
  showUnusedColumnsToReviewers: boolean;
  showAgreementToReviewers: boolean;
  reviewedWhen: ReviewedWhen;
  showOnlyManuallyAssigned: boolean;
  showOnlyFinishedTasks: boolean;
  taskOrdering: TaskOrdering;
  taskLimitPercent: number;
}

// ==========================================
// Quality Settings Types
// ==========================================

export type AgreementMetric = "basic_matching";

export interface QualitySettings {
  annotationsPerTask: number;
  limitTasksPerAnnotator: boolean;
  taskLimitPerAnnotator: number;
  agreementMetric: AgreementMetric;
  customWeights: Record<string, number>;
}

// ==========================================
// Task and Annotation Types
// ==========================================

export type TaskStatus = "pending" | "in_progress" | "completed";
export type AnnotationStatus = "submitted" | "skipped" | "pending";
export type AnnotationReviewStatus = "accepted" | "rejected" | "fix_accepted";

export interface Task {
  id: string;
  projectId: string;
  data: Record<string, any>;
  status: TaskStatus;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Annotation {
  id: string;
  taskId: string;
  projectId: string;
  userId: string;
  status: AnnotationStatus;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  timeSpent: number;
}

export interface AnnotationReview {
  id: string;
  annotationId: string;
  reviewerId: string;
  status: AnnotationReviewStatus;
  reviewedAt: string;
  feedback: string | null;
}

// ==========================================
// Performance Tracking Types
// ==========================================

export interface PerformanceOverview {
  totalSubmitted: number;
  totalSkipped: number;
  totalPending: number;
  timeAnnotating: number;
  performanceScore: number;
  totalReviewed: number;
  acceptedCount: number;
  fixAcceptedCount: number;
  rejectedCount: number;
}

export interface PerformanceTimelinePoint {
  date: string;
  submitted: number;
  skipped: number;
}

export interface TimeSpentDataPoint {
  date: string;
  avgTimePerAnnotation: number;
  totalTimeHours: number;
  annotationCount: number;
}

export interface AnnotatorPerformance {
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
  assigned: number;
  pending: number;
  submitted: number;
  skipped: number;
  performanceScore: number;
  accepted: number;
  fixAccepted: number;
  rejected: number;
  totalTime: number;
  avgTime: number;
  medianTime: number;
}

export interface PerformanceQuery {
  userId?: string;
  workspaceId?: string;
  projectId?: string;
  startDate?: string;
  endDate?: string;
}

// ==========================================
// Data Management Types
// ==========================================

export type ColumnType = "text" | "number" | "boolean" | "date" | "json";

export interface ColumnDefinition {
  name: string;
  type: ColumnType;
  displayName: string;
}

export interface DataColumn {
  id: string;
  projectId: string;
  name: string;
  type: ColumnType;
  displayName: string;
  visible: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateDataColumnRequest {
  visible?: boolean;
  order?: number;
  displayName?: string;
}

export interface ReorderColumnsRequest {
  columnIds: string[];
}

export interface TaskData {
  id: string;
  taskId: string;
  data: Record<string, any>;
  columnSchema: ColumnDefinition[];
  createdAt: string;
  updatedAt: string;
}

export interface FileUploadResponse {
  taskCount: number;
  columnCount: number;
  columns: DataColumn[];
  sampleData?: Array<Record<string, any>>;
}

export interface TaskWithData {
  id: string;
  projectId: string;
  status: TaskStatus;
  assignedTo: string | null;
  assignedUser?: {
    id: string;
    name: string;
    email: string;
  } | null;
  data: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedTasks {
  tasks: TaskWithData[];
  columns: DataColumn[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface UpdateTaskDataRequest {
  data: Record<string, any>;
}

// ==========================================
// Data Import Types
// ==========================================

export type DataImportSourceType = "file" | "url";
export type DataImportStatus = "pending" | "processing" | "completed" | "failed";

export interface DataImport {
  id: string;
  projectId: string;
  sourceType: DataImportSourceType;
  sourceUrl: string | null;
  fileName: string | null;
  fileType: string | null;
  status: DataImportStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDataImportRequest {
  sourceType: DataImportSourceType;
  sourceUrl?: string;
  fileName?: string;
  fileType?: string;
}

// ==========================================
// Preset Template Types
// ==========================================

export interface PresetTemplate {
  id: string;
  name: string;
  type: LabelingTemplateType;
  description: string;
  config: Record<string, any>;
}

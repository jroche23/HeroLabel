import { z } from "zod";

// ==========================================
// Project Schemas
// ==========================================

// Project model schema
export const projectSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  workspace: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  userId: z.string(),
});

// Create project request
export const createProjectSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  workspace: z.string().optional(),
});

// Update project request
export const updateProjectSchema = z.object({
  title: z.string().min(1, "Title is required").max(255).optional(),
  description: z.string().optional(),
  workspace: z.string().optional(),
});

// Annotation settings schema
export const annotationSettingsSchema = z.object({
  allowEmptyAnnotations: z.boolean().default(true),
  showDataManagerToAnnotators: z.boolean().default(false),
  allowSkipping: z.boolean().default(true),
  requireCommentToSkip: z.boolean().default(false),
  skipQueue: z.enum(["requeue_same", "requeue_others", "ignore"]).default("requeue_same"),
  usePredictionsToPreLabel: z.boolean().default(true),
  revealPreAnnotationsInteractively: z.boolean().default(false),
  showInstructionsBeforeLabeling: z.boolean().default(false),
  instructions: z.string().default(""),
  taskAssignment: z.enum(["automatic", "manual"]).default("manual"),
});

export type AnnotationSettings = z.infer<typeof annotationSettingsSchema>;

export const DEFAULT_ANNOTATION_SETTINGS: AnnotationSettings = {
  allowEmptyAnnotations: true,
  showDataManagerToAnnotators: false,
  allowSkipping: true,
  requireCommentToSkip: false,
  skipQueue: "requeue_same",
  usePredictionsToPreLabel: true,
  revealPreAnnotationsInteractively: false,
  showInstructionsBeforeLabeling: false,
  instructions: "",
  taskAssignment: "manual",
};

// Review settings schema
export const reviewSettingsSchema = z.object({
  // Instructions
  showInstructionsBeforeReviewing: z.boolean().default(false),
  reviewInstructions: z.string().default(""),
  // Reject options
  rejectAction: z.enum(["remove_from_queue", "requeue_to_annotator", "reviewer_decides"]).default("remove_from_queue"),
  requireCommentOnReject: z.boolean().default(false),
  // Data manager visibility
  showDataManagerToReviewers: z.boolean().default(true),
  showUnusedColumnsToReviewers: z.boolean().default(true),
  showAgreementToReviewers: z.boolean().default(false),
  // Reviewing options
  reviewedWhen: z.enum(["one_accepted", "all_reviewed"]).default("one_accepted"),
  showOnlyManuallyAssigned: z.boolean().default(false),
  showOnlyFinishedTasks: z.boolean().default(false),
  // Task ordering
  taskOrdering: z.enum(["by_task_id", "random"]).default("by_task_id"),
  taskLimitPercent: z.number().min(1).max(100).default(100),
});

export type ReviewSettings = z.infer<typeof reviewSettingsSchema>;

export const DEFAULT_REVIEW_SETTINGS: ReviewSettings = {
  showInstructionsBeforeReviewing: false,
  reviewInstructions: "",
  rejectAction: "remove_from_queue",
  requireCommentOnReject: false,
  showDataManagerToReviewers: true,
  showUnusedColumnsToReviewers: true,
  showAgreementToReviewers: false,
  reviewedWhen: "one_accepted",
  showOnlyManuallyAssigned: false,
  showOnlyFinishedTasks: false,
  taskOrdering: "by_task_id",
  taskLimitPercent: 100,
};

// ==========================================
// Project Member Schemas
// ==========================================

export const projectMemberRoleSchema = z.enum([
  "OWNER",
  "ADMINISTRATOR",
  "MANAGER",
  "REVIEWER",
  "ANNOTATOR",
]);

export const projectMemberSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  email: z.string(),
  name: z.string(),
  role: projectMemberRoleSchema,
  addedAt: z.string(),
});

export const addProjectMemberSchema = z.object({
  email: z.string().email("Valid email is required"),
  name: z.string().min(1, "Name is required"),
  role: projectMemberRoleSchema,
});

export const updateProjectMemberRoleSchema = z.object({
  role: projectMemberRoleSchema,
});

export type ProjectMemberRole = z.infer<typeof projectMemberRoleSchema>;
export type ProjectMember = z.infer<typeof projectMemberSchema>;
export type AddProjectMemberRequest = z.infer<typeof addProjectMemberSchema>;
export type UpdateProjectMemberRoleRequest = z.infer<typeof updateProjectMemberRoleSchema>;

// Quality settings schema
export const qualitySettingsSchema = z.object({
  // Overlap: how many annotators must label each task before it's marked complete
  annotationsPerTask: z.number().int().min(1).max(10).default(1),
  // Tasks per annotator limit
  limitTasksPerAnnotator: z.boolean().default(false),
  taskLimitPerAnnotator: z.number().int().min(1).default(1),
  // Agreement
  agreementMetric: z.enum(["basic_matching"]).default("basic_matching"),
  // Custom weights: key is "tagName" or "tagName::labelValue", value is 0-100
  customWeights: z.record(z.string(), z.number()).default({}),
});

export type QualitySettings = z.infer<typeof qualitySettingsSchema>;

export const DEFAULT_QUALITY_SETTINGS: QualitySettings = {
  annotationsPerTask: 1,
  limitTasksPerAnnotator: false,
  taskLimitPerAnnotator: 1,
  agreementMetric: "basic_matching",
  customWeights: {},
};

// ==========================================
// Labeling Template Schemas
// ==========================================

// Labeling template type enum
export const labelingTemplateTypeSchema = z.enum([
  "image_captioning",
  "image_classification",
  "object_detection",
  "text_classification",
  "named_entity_recognition",
  "audio_classification",
  "video_classification",
  "custom",
]);

// Labeling template model schema
export const labelingTemplateSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string(),
  type: labelingTemplateTypeSchema,
  config: z.record(z.string(), z.any()), // JSON object for template configuration
  isPreset: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Create/update labeling template request
export const createLabelingTemplateSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  type: labelingTemplateTypeSchema,
  config: z.record(z.string(), z.any()),
  isPreset: z.boolean().optional().default(false),
});

// ==========================================
// Data Import Schemas
// ==========================================

// Data import source type enum
export const dataImportSourceTypeSchema = z.enum(["file", "url"]);

// Data import status enum
export const dataImportStatusSchema = z.enum([
  "pending",
  "processing",
  "completed",
  "failed",
]);

// Data import model schema
export const dataImportSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  sourceType: dataImportSourceTypeSchema,
  sourceUrl: z.string().nullable(),
  fileName: z.string().nullable(),
  fileType: z.string().nullable(),
  status: dataImportStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Create data import request
export const createDataImportSchema = z.object({
  sourceType: dataImportSourceTypeSchema,
  sourceUrl: z.string().url().optional(),
  fileName: z.string().optional(),
  fileType: z.string().optional(),
});

// ==========================================
// Preset Templates
// ==========================================

// Preset template for common labeling tasks
export const presetTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: labelingTemplateTypeSchema,
  description: z.string(),
  config: z.record(z.string(), z.any()),
});

// ==========================================
// Type Exports
// ==========================================

export type Project = z.infer<typeof projectSchema>;
export type CreateProjectRequest = z.infer<typeof createProjectSchema>;
export type UpdateProjectRequest = z.infer<typeof updateProjectSchema>;

export type LabelingTemplate = z.infer<typeof labelingTemplateSchema>;
export type LabelingTemplateType = z.infer<typeof labelingTemplateTypeSchema>;
export type CreateLabelingTemplateRequest = z.infer<typeof createLabelingTemplateSchema>;

export type DataImport = z.infer<typeof dataImportSchema>;
export type DataImportSourceType = z.infer<typeof dataImportSourceTypeSchema>;
export type DataImportStatus = z.infer<typeof dataImportStatusSchema>;
export type CreateDataImportRequest = z.infer<typeof createDataImportSchema>;

export type PresetTemplate = z.infer<typeof presetTemplateSchema>;

// ==========================================
// Organization Member Management Schemas
// ==========================================

// Role enum matching Prisma schema
export const roleSchema = z.enum([
  "OWNER",
  "ADMINISTRATOR",
  "MANAGER",
  "REVIEWER",
  "ANNOTATOR",
]);

// Member status enum
export const memberStatusSchema = z.enum(["active", "inactive"]);

// Invitation status enum
export const invitationStatusSchema = z.enum(["pending", "accepted", "expired"]);

// Role permissions definition
export const rolePermissionsSchema = z.object({
  role: roleSchema,
  permissions: z.object({
    // Organization-level permissions
    manageOrganization: z.boolean(),
    manageAllWorkspaces: z.boolean(),
    manageAllProjects: z.boolean(),
    viewActivityLog: z.boolean(),
    manageUsageAndLicense: z.boolean(),
    viewUsageAndLicense: z.boolean(),
    managePermissions: z.boolean(),
    approveInvitations: z.boolean(),

    // Workspace-level permissions
    manageAssignedWorkspaces: z.boolean(),
    viewAllProjects: z.boolean(),
    manageOwnProjects: z.boolean(),

    // Task-level permissions
    reviewTasks: z.boolean(),
    updateAnnotatedTasks: z.boolean(),
    labelTasks: z.boolean(),
    viewAllTasks: z.boolean(),
    viewAssignedTasks: z.boolean(),
    viewOwnTasks: z.boolean(),
  }),
});

// Organization model schema
export const organizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Organization member model schema
export const organizationMemberSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  userId: z.string(),
  role: roleSchema,
  status: memberStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    image: z.string().nullable(),
  }).optional(),
});

// Member invitation model schema
export const memberInvitationSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  email: z.string(),
  role: roleSchema,
  invitedBy: z.string(),
  status: invitationStatusSchema,
  token: z.string(),
  expiresAt: z.string(),
  createdAt: z.string(),
  inviter: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
  }).optional(),
  organization: z.object({
    id: z.string(),
    name: z.string(),
  }).optional(),
});

// Create organization request
export const createOrganizationSchema = z.object({
  name: z.string().min(1, "Organization name is required").max(255),
});

// Invite member request
export const inviteMemberSchema = z.object({
  email: z.string().email("Valid email is required"),
  role: roleSchema,
});

// Update member role request
export const updateMemberRoleSchema = z.object({
  role: roleSchema,
});

// Update member status request
export const updateMemberStatusSchema = z.object({
  status: memberStatusSchema,
});

// ==========================================
// Type Exports for Organization Management
// ==========================================

export type Role = z.infer<typeof roleSchema>;
export type MemberStatus = z.infer<typeof memberStatusSchema>;
export type InvitationStatus = z.infer<typeof invitationStatusSchema>;
export type RolePermissions = z.infer<typeof rolePermissionsSchema>;
export type Organization = z.infer<typeof organizationSchema>;
export type OrganizationMember = z.infer<typeof organizationMemberSchema>;
export type MemberInvitation = z.infer<typeof memberInvitationSchema>;
export type CreateOrganizationRequest = z.infer<typeof createOrganizationSchema>;
export type InviteMemberRequest = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberRoleRequest = z.infer<typeof updateMemberRoleSchema>;
export type UpdateMemberStatusRequest = z.infer<typeof updateMemberStatusSchema>;

// ==========================================
// Task and Annotation Schemas
// ==========================================

// Task status enum
export const taskStatusSchema = z.enum(["pending", "in_progress", "completed"]);

// Annotation status enum
export const annotationStatusSchema = z.enum(["submitted", "skipped", "pending"]);

// Annotation review status enum
export const annotationReviewStatusSchema = z.enum(["accepted", "rejected", "fix_accepted"]);

// Task model schema
export const taskSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  data: z.record(z.string(), z.any()), // JSON object for task data
  status: taskStatusSchema,
  assignedTo: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Annotation model schema
export const annotationSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  projectId: z.string(),
  userId: z.string(),
  status: annotationStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  submittedAt: z.string().nullable(),
  timeSpent: z.number(), // in minutes
});

// Annotation review model schema
export const annotationReviewSchema = z.object({
  id: z.string(),
  annotationId: z.string(),
  reviewerId: z.string(),
  status: annotationReviewStatusSchema,
  reviewedAt: z.string(),
  feedback: z.string().nullable(),
});

// ==========================================
// Performance Tracking Schemas
// ==========================================

// Performance overview response
export const performanceOverviewSchema = z.object({
  totalSubmitted: z.number(),
  totalSkipped: z.number(),
  totalPending: z.number(),
  timeAnnotating: z.number(), // total time in hours
  performanceScore: z.number(), // percentage
  totalReviewed: z.number(),
  acceptedCount: z.number(),
  fixAcceptedCount: z.number(),
  rejectedCount: z.number(),
});

// Performance timeline data point
export const performanceTimelinePointSchema = z.object({
  date: z.string(), // YYYY-MM-DD format
  submitted: z.number(),
  skipped: z.number(),
});

// Time spent data point
export const timeSpentDataPointSchema = z.object({
  date: z.string(), // YYYY-MM-DD format
  avgTimePerAnnotation: z.number(), // in minutes
  totalTimeHours: z.number(),
  annotationCount: z.number(),
});

// Annotator performance row
export const annotatorPerformanceSchema = z.object({
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    image: z.string().nullable(),
  }),
  assigned: z.number(),
  pending: z.number(),
  submitted: z.number(),
  skipped: z.number(),
  performanceScore: z.number(), // percentage
  accepted: z.number(),
  fixAccepted: z.number(),
  rejected: z.number(),
  totalTime: z.number(), // in hours
  avgTime: z.number(), // in minutes
  medianTime: z.number(), // in minutes
});

// Performance query parameters
export const performanceQuerySchema = z.object({
  userId: z.string().optional(),
  workspaceId: z.string().optional(),
  projectId: z.string().optional(),
  startDate: z.string().optional(), // ISO date string
  endDate: z.string().optional(), // ISO date string
});

// ==========================================
// Type Exports for Task and Performance
// ==========================================

export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type AnnotationStatus = z.infer<typeof annotationStatusSchema>;
export type AnnotationReviewStatus = z.infer<typeof annotationReviewStatusSchema>;
export type Task = z.infer<typeof taskSchema>;
export type Annotation = z.infer<typeof annotationSchema>;
export type AnnotationReview = z.infer<typeof annotationReviewSchema>;
export type PerformanceOverview = z.infer<typeof performanceOverviewSchema>;
export type PerformanceTimelinePoint = z.infer<typeof performanceTimelinePointSchema>;
export type TimeSpentDataPoint = z.infer<typeof timeSpentDataPointSchema>;
export type AnnotatorPerformance = z.infer<typeof annotatorPerformanceSchema>;
export type PerformanceQuery = z.infer<typeof performanceQuerySchema>;

// ==========================================
// Data Management Schemas
// ==========================================

// Column type enum
export const columnTypeSchema = z.enum(["text", "number", "boolean", "date", "json"]);

// Column definition schema
export const columnDefinitionSchema = z.object({
  name: z.string(),
  type: columnTypeSchema,
  displayName: z.string(),
});

// Data column model schema
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

// Update data column request
export const updateDataColumnSchema = z.object({
  visible: z.boolean().optional(),
  order: z.number().optional(),
  displayName: z.string().optional(),
});

// Reorder columns request
export const reorderColumnsSchema = z.object({
  columnIds: z.array(z.string()), // Array of column IDs in desired order
});

// Task data model schema
export const taskDataSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  data: z.record(z.string(), z.any()), // Dynamic JSON data
  columnSchema: z.array(columnDefinitionSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// File upload response
export const fileUploadResponseSchema = z.object({
  taskCount: z.number(),
  columnCount: z.number(),
  columns: z.array(dataColumnSchema),
  sampleData: z.array(z.record(z.string(), z.any())).optional(),
});

// Task with data schema (for data manager view)
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
  data: z.record(z.string(), z.any()), // Dynamic columns
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

// Update task data request
export const updateTaskDataSchema = z.object({
  data: z.record(z.string(), z.any()),
});

// ==========================================
// Type Exports for Data Management
// ==========================================

export type ColumnType = z.infer<typeof columnTypeSchema>;
export type ColumnDefinition = z.infer<typeof columnDefinitionSchema>;
export type DataColumn = z.infer<typeof dataColumnSchema>;
export type UpdateDataColumnRequest = z.infer<typeof updateDataColumnSchema>;
export type ReorderColumnsRequest = z.infer<typeof reorderColumnsSchema>;
export type TaskData = z.infer<typeof taskDataSchema>;
export type FileUploadResponse = z.infer<typeof fileUploadResponseSchema>;
export type TaskWithData = z.infer<typeof taskWithDataSchema>;
export type PaginatedTasks = z.infer<typeof paginatedTasksSchema>;
export type UpdateTaskDataRequest = z.infer<typeof updateTaskDataSchema>;

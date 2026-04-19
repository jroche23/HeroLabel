import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { prisma } from "../prisma";
import {
  createProjectSchema,
  updateProjectSchema,
  createLabelingTemplateSchema,
  createDataImportSchema,
  annotationSettingsSchema,
  DEFAULT_ANNOTATION_SETTINGS,
  reviewSettingsSchema,
  DEFAULT_REVIEW_SETTINGS,
  qualitySettingsSchema,
  DEFAULT_QUALITY_SETTINGS,
  addProjectMemberSchema,
  updateProjectMemberRoleSchema,
} from "../types";

// Create router with typed context for auth
const projectsRouter = new Hono<{
  Variables: {
    user: any;
    session: any;
  };
}>();

// ==========================================
// Preset Templates (public route - no auth required)
// ==========================================

// GET /templates/presets - Get preset templates
projectsRouter.get("/templates/presets", (c) => {
  const presets = [
    {
      id: "preset-image-captioning",
      name: "Image Captioning",
      type: "image_captioning",
      description: "Add text descriptions to images",
      config: {
        interfaceType: "captioning",
        fields: [
          {
            name: "caption",
            type: "textarea",
            label: "Caption",
            placeholder: "Describe the image...",
          },
        ],
      },
    },
    {
      id: "preset-image-classification",
      name: "Image Classification",
      type: "image_classification",
      description: "Classify images into predefined categories",
      config: {
        interfaceType: "classification",
        labels: ["Category A", "Category B", "Category C"],
        multiSelect: false,
      },
    },
    {
      id: "preset-object-detection",
      name: "Object Detection",
      type: "object_detection",
      description: "Draw bounding boxes around objects in images",
      config: {
        interfaceType: "bounding_box",
        labels: ["Person", "Car", "Building", "Tree"],
        showLabels: true,
      },
    },
    {
      id: "preset-text-classification",
      name: "Text Classification",
      type: "text_classification",
      description: "Classify text into predefined categories",
      config: {
        interfaceType: "classification",
        labels: ["Positive", "Negative", "Neutral"],
        multiSelect: false,
      },
    },
    {
      id: "preset-ner",
      name: "Named Entity Recognition",
      type: "named_entity_recognition",
      description: "Identify and label entities in text",
      config: {
        interfaceType: "ner",
        entities: [
          { name: "Person", color: "#FF6B6B" },
          { name: "Organization", color: "#4ECDC4" },
          { name: "Location", color: "#45B7D1" },
          { name: "Date", color: "#FFA07A" },
        ],
      },
    },
    {
      id: "preset-audio-classification",
      name: "Audio Classification",
      type: "audio_classification",
      description: "Classify audio clips into categories",
      config: {
        interfaceType: "classification",
        labels: ["Speech", "Music", "Noise", "Silence"],
        multiSelect: true,
      },
    },
  ];

  return c.json({ data: presets });
});

// ==========================================
// Project CRUD Operations
// ==========================================

// GET /api/projects - List all projects the authenticated user owns or is a member of
projectsRouter.get("/", async (c) => {
  const user = c.get("user");

  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { userId: user.id },
        { members: { some: { email: user.email } } },
      ],
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Transform dates to ISO strings
  const transformedProjects = projects.map((project) => ({
    ...project,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  }));

  return c.json({ data: transformedProjects });
});

// GET /api/projects/:id - Get a single project
projectsRouter.get("/:id", async (c) => {
  const user = c.get("user");
  const projectId = c.req.param("id");

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { userId: user.id },
        { members: { some: { email: user.email } } },
      ],
    },
    include: {
      labelingTemplates: true,
      dataImports: true,
    },
  });

  if (!project) {
    return c.json(
      { error: { message: "Project not found", code: "NOT_FOUND" } },
      404
    );
  }

  // Transform dates to ISO strings
  const transformedProject = {
    ...project,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    labelingTemplates: project.labelingTemplates.map((template) => ({
      ...template,
      config: JSON.parse(template.config),
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    })),
    dataImports: project.dataImports.map((dataImport) => ({
      ...dataImport,
      createdAt: dataImport.createdAt.toISOString(),
      updatedAt: dataImport.updatedAt.toISOString(),
    })),
  };

  return c.json({ data: transformedProject });
});

// POST /api/projects - Create a new project
projectsRouter.post("/", zValidator("json", createProjectSchema), async (c) => {
  const user = c.get("user");
  const data = c.req.valid("json");

  const project = await prisma.project.create({
    data: {
      title: data.title,
      description: data.description || null,
      workspace: data.workspace || null,
      userId: user.id,
    },
  });

  const transformedProject = {
    ...project,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };

  return c.json({ data: transformedProject }, 201);
});

// PUT /api/projects/:id - Update a project
projectsRouter.put("/:id", zValidator("json", updateProjectSchema), async (c) => {
  const user = c.get("user");
  const projectId = c.req.param("id");
  const data = c.req.valid("json");

  // Check if project exists and belongs to user
  const existingProject = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId: user.id,
    },
  });

  if (!existingProject) {
    return c.json(
      { error: { message: "Project not found", code: "NOT_FOUND" } },
      404
    );
  }

  const project = await prisma.project.update({
    where: {
      id: projectId,
    },
    data: {
      title: data.title,
      description: data.description !== undefined ? data.description : undefined,
      workspace: data.workspace !== undefined ? data.workspace : undefined,
    },
  });

  const transformedProject = {
    ...project,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };

  return c.json({ data: transformedProject });
});

// DELETE /api/projects/:id - Delete a project
projectsRouter.delete("/:id", async (c) => {
  const user = c.get("user");
  const projectId = c.req.param("id");

  // Check if project exists and belongs to user
  const existingProject = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId: user.id,
    },
  });

  if (!existingProject) {
    return c.json(
      { error: { message: "Project not found", code: "NOT_FOUND" } },
      404
    );
  }

  await prisma.project.delete({
    where: {
      id: projectId,
    },
  });

  return c.body(null, 204);
});

// ==========================================
// Data Import Operations
// ==========================================

// POST /api/projects/:id/import - Add a data import to a project
projectsRouter.post(
  "/:id/import",
  zValidator("json", createDataImportSchema),
  async (c) => {
    const user = c.get("user");
    const projectId = c.req.param("id");
    const data = c.req.valid("json");

    // Check if project exists and belongs to user
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: user.id,
      },
    });

    if (!project) {
      return c.json(
        { error: { message: "Project not found", code: "NOT_FOUND" } },
        404
      );
    }

    const dataImport = await prisma.dataImport.create({
      data: {
        projectId: projectId,
        sourceType: data.sourceType,
        sourceUrl: data.sourceUrl || null,
        fileName: data.fileName || null,
        fileType: data.fileType || null,
        status: "pending",
      },
    });

    const transformedDataImport = {
      ...dataImport,
      createdAt: dataImport.createdAt.toISOString(),
      updatedAt: dataImport.updatedAt.toISOString(),
    };

    return c.json({ data: transformedDataImport }, 201);
  }
);

// ==========================================
// Labeling Template Operations
// ==========================================

// POST /api/projects/:id/template - Add or update a labeling template
projectsRouter.post(
  "/:id/template",
  zValidator("json", createLabelingTemplateSchema),
  async (c) => {
    const user = c.get("user");
    const projectId = c.req.param("id");
    const data = c.req.valid("json");

    // Check if project exists and belongs to user
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: user.id,
      },
    });

    if (!project) {
      return c.json(
        { error: { message: "Project not found", code: "NOT_FOUND" } },
        404
      );
    }

    const template = await prisma.labelingTemplate.create({
      data: {
        projectId: projectId,
        name: data.name,
        type: data.type,
        config: JSON.stringify(data.config),
        isPreset: data.isPreset || false,
      },
    });

    const transformedTemplate = {
      ...template,
      config: JSON.parse(template.config),
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    };

    return c.json({ data: transformedTemplate }, 201);
  }
);

// ==========================================
// Annotation Settings Operations
// ==========================================

// GET /api/projects/:id/annotation-settings
projectsRouter.get("/:id/annotation-settings", async (c) => {
  const user = c.get("user");
  const projectId = c.req.param("id");

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: user.id },
    select: { annotationSettings: true },
  });

  if (!project) {
    return c.json({ error: { message: "Project not found", code: "NOT_FOUND" } }, 404);
  }

  const settings = project.annotationSettings
    ? JSON.parse(project.annotationSettings)
    : DEFAULT_ANNOTATION_SETTINGS;

  return c.json({ data: settings });
});

// PUT /api/projects/:id/annotation-settings
projectsRouter.put(
  "/:id/annotation-settings",
  zValidator("json", annotationSettingsSchema),
  async (c) => {
    const user = c.get("user");
    const projectId = c.req.param("id");
    const settings = c.req.valid("json");

    const existing = await prisma.project.findFirst({
      where: { id: projectId, userId: user.id },
    });

    if (!existing) {
      return c.json({ error: { message: "Project not found", code: "NOT_FOUND" } }, 404);
    }

    await prisma.project.update({
      where: { id: projectId },
      data: { annotationSettings: JSON.stringify(settings) },
    });

    return c.json({ data: settings });
  }
);

// ==========================================
// Review Settings Operations
// ==========================================

// GET /api/projects/:id/review-settings
projectsRouter.get("/:id/review-settings", async (c) => {
  const user = c.get("user");
  const projectId = c.req.param("id");

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: user.id },
    select: { reviewSettings: true },
  });

  if (!project) {
    return c.json({ error: { message: "Project not found", code: "NOT_FOUND" } }, 404);
  }

  const settings = project.reviewSettings
    ? JSON.parse(project.reviewSettings)
    : DEFAULT_REVIEW_SETTINGS;

  return c.json({ data: settings });
});

// PUT /api/projects/:id/review-settings
projectsRouter.put(
  "/:id/review-settings",
  zValidator("json", reviewSettingsSchema),
  async (c) => {
    const user = c.get("user");
    const projectId = c.req.param("id");
    const settings = c.req.valid("json");

    const existing = await prisma.project.findFirst({
      where: { id: projectId, userId: user.id },
    });

    if (!existing) {
      return c.json({ error: { message: "Project not found", code: "NOT_FOUND" } }, 404);
    }

    await prisma.project.update({
      where: { id: projectId },
      data: { reviewSettings: JSON.stringify(settings) },
    });

    return c.json({ data: settings });
  }
);

// ==========================================
// Quality Settings Operations
// ==========================================

// GET /api/projects/:id/quality-settings
projectsRouter.get("/:id/quality-settings", async (c) => {
  const user = c.get("user");
  const projectId = c.req.param("id");

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: user.id },
    select: { qualitySettings: true },
  });

  if (!project) {
    return c.json({ error: { message: "Project not found", code: "NOT_FOUND" } }, 404);
  }

  const settings = project.qualitySettings
    ? JSON.parse(project.qualitySettings)
    : DEFAULT_QUALITY_SETTINGS;

  return c.json({ data: settings });
});

// PUT /api/projects/:id/quality-settings
projectsRouter.put(
  "/:id/quality-settings",
  zValidator("json", qualitySettingsSchema),
  async (c) => {
    const user = c.get("user");
    const projectId = c.req.param("id");
    const settings = c.req.valid("json");

    const existing = await prisma.project.findFirst({
      where: { id: projectId, userId: user.id },
    });

    if (!existing) {
      return c.json({ error: { message: "Project not found", code: "NOT_FOUND" } }, 404);
    }

    await prisma.project.update({
      where: { id: projectId },
      data: { qualitySettings: JSON.stringify(settings) },
    });

    return c.json({ data: settings });
  }
);

// ==========================================
// Project Member Operations
// ==========================================

// GET /api/projects/:id/members - List project members
projectsRouter.get("/:id/members", async (c) => {
  const user = c.get("user");
  const projectId = c.req.param("id");

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: user.id },
  });
  if (!project) {
    return c.json({ error: { message: "Project not found", code: "NOT_FOUND" } }, 404);
  }

  const members = await prisma.projectMember.findMany({
    where: { projectId },
    orderBy: { addedAt: "asc" },
  });

  const transformed = members.map((m) => ({
    ...m,
    addedAt: m.addedAt.toISOString(),
  }));

  return c.json({ data: transformed });
});

// POST /api/projects/:id/members - Add a member
projectsRouter.post(
  "/:id/members",
  zValidator("json", addProjectMemberSchema),
  async (c) => {
    const user = c.get("user");
    const projectId = c.req.param("id");
    const data = c.req.valid("json");

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: user.id },
    });
    if (!project) {
      return c.json({ error: { message: "Project not found", code: "NOT_FOUND" } }, 404);
    }

    const member = await prisma.projectMember.upsert({
      where: { projectId_email: { projectId, email: data.email } },
      update: { name: data.name, role: data.role },
      create: { projectId, email: data.email, name: data.name, role: data.role },
    });

    return c.json({ data: { ...member, addedAt: member.addedAt.toISOString() } }, 201);
  }
);

// PATCH /api/projects/:id/members/:memberId - Update member role
projectsRouter.patch(
  "/:id/members/:memberId",
  zValidator("json", updateProjectMemberRoleSchema),
  async (c) => {
    const user = c.get("user");
    const projectId = c.req.param("id");
    const memberId = c.req.param("memberId");
    const { role } = c.req.valid("json");

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: user.id },
    });
    if (!project) {
      return c.json({ error: { message: "Project not found", code: "NOT_FOUND" } }, 404);
    }

    const member = await prisma.projectMember.findFirst({
      where: { id: memberId, projectId },
    });
    if (!member) {
      return c.json({ error: { message: "Member not found", code: "NOT_FOUND" } }, 404);
    }

    const updated = await prisma.projectMember.update({
      where: { id: memberId },
      data: { role },
    });

    return c.json({ data: { ...updated, addedAt: updated.addedAt.toISOString() } });
  }
);

// DELETE /api/projects/:id/members/:memberId - Remove a member
projectsRouter.delete("/:id/members/:memberId", async (c) => {
  const user = c.get("user");
  const projectId = c.req.param("id");
  const memberId = c.req.param("memberId");

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: user.id },
  });
  if (!project) {
    return c.json({ error: { message: "Project not found", code: "NOT_FOUND" } }, 404);
  }

  const member = await prisma.projectMember.findFirst({
    where: { id: memberId, projectId },
  });
  if (!member) {
    return c.json({ error: { message: "Member not found", code: "NOT_FOUND" } }, 404);
  }

  await prisma.projectMember.delete({ where: { id: memberId } });
  return c.body(null, 204);
});

// ==========================================
// Annotations
// ==========================================

// POST /api/projects/:id/tasks/:taskId/annotate — save a single annotation
projectsRouter.post("/:id/tasks/:taskId/annotate", async (c) => {
  const user = c.get("user");
  const projectId = c.req.param("id");
  const taskId = c.req.param("taskId");

  let body: { choice?: string; reasoning?: string; comment?: string; status?: string; result?: object[] };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: { message: "Invalid JSON body" } }, 400);
  }

  const { choice, reasoning, comment, status = "submitted", result: rawResult } = body;

  // If a pre-built result array is provided (template mode), use it directly.
  // Otherwise, build from simple choice/reasoning fields.
  let resultItems: object[];
  if (rawResult && rawResult.length > 0) {
    resultItems = rawResult;
  } else {
    resultItems = [];
    if (choice) {
      resultItems.push({
        id: crypto.randomUUID(),
        type: "choices",
        from_name: "classification",
        to_name: "task",
        value: { choices: [choice] },
      });
    }
    if (reasoning) {
      resultItems.push({
        id: crypto.randomUUID(),
        type: "taxonomy",
        from_name: "reasoning",
        to_name: "task",
        value: { choices: [reasoning] },
      });
    }
  }

  const now = new Date();

  await prisma.annotation.deleteMany({ where: { taskId, userId: user.id } });
  const annotation = await prisma.annotation.create({
    data: {
      taskId,
      projectId,
      userId: user.id,
      status,
      result: resultItems.length > 0 ? JSON.stringify(resultItems) : null,
      comment: comment ?? null,
      submittedAt: status === "submitted" ? now : null,
      timeSpent: 0,
    },
    select: { id: true, taskId: true, status: true },
  });

  await prisma.task.update({
    where: { id: taskId },
    data: { status: status === "submitted" ? "completed" : "in_progress" },
  });

  return c.json({ data: annotation });
});

// GET /api/projects/:id/annotations — returns all submitted annotations by the current user
projectsRouter.get("/:id/annotations", async (c) => {
  const user = c.get("user");
  const projectId = c.req.param("id");

  const annotations = await prisma.annotation.findMany({
    where: { projectId, userId: user.id, status: "submitted" },
    select: {
      id: true,
      taskId: true,
      userId: true,
      status: true,
      result: true,
      comment: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { submittedAt: "desc" },
  });

  return c.json({ data: annotations });
});

// ==========================================
// Bulk Annotation
// ==========================================

// POST /api/projects/:id/tasks/bulk-annotate
// Body: { taskIds: string[], choice: string, reasoning?: string, comment?: string }
projectsRouter.post("/:id/tasks/bulk-annotate", async (c) => {
  const user = c.get("user");
  const projectId = c.req.param("id");

  let body: { taskIds: string[]; choice: string; reasoning?: string; comment?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: { message: "Invalid JSON body" } }, 400);
  }

  const { taskIds, choice, reasoning, comment } = body;
  if (!Array.isArray(taskIds) || taskIds.length === 0 || !choice) {
    return c.json({ error: { message: "taskIds (array) and choice (string) are required" } }, 400);
  }

  const now = new Date();

  // Build result JSON matching the AnnotationResult shape used by LabelingInterface
  const resultItems: object[] = [
    {
      id: crypto.randomUUID(),
      type: "choices",
      from_name: "classification",
      to_name: "task",
      value: { choices: [choice] },
    },
  ];
  if (reasoning) {
    resultItems.push({
      id: crypto.randomUUID(),
      type: "taxonomy",
      from_name: "reasoning",
      to_name: "task",
      value: { choices: [reasoning] },
    });
  }
  const resultJson = JSON.stringify(resultItems);

  // Create or overwrite one annotation per task
  await Promise.all(
    taskIds.map(async (taskId) => {
      await prisma.annotation.deleteMany({
        where: { taskId, userId: user.id },
      });
      await prisma.annotation.create({
        data: {
          taskId,
          projectId,
          userId: user.id,
          status: "submitted",
          result: resultJson,
          comment: comment ?? null,
          submittedAt: now,
          timeSpent: 0,
        },
      });
      await prisma.task.update({
        where: { id: taskId },
        data: { status: "completed" },
      });
    })
  );

  return c.json({ data: { count: taskIds.length, choice } });
});

// POST /api/projects/:id/tasks/bulk-assign
// Body: { taskIds: string[], assigneeId: string | null }
projectsRouter.post("/:id/tasks/bulk-assign", async (c) => {
  const { id: projectId } = c.req.param();

  let body: { taskIds: string[]; assigneeId: string | null };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: { message: "Invalid JSON body" } }, 400);
  }

  const { taskIds, assigneeId } = body;
  if (!Array.isArray(taskIds) || taskIds.length === 0) {
    return c.json({ error: { message: "taskIds (array) is required" } }, 400);
  }

  await prisma.task.updateMany({
    where: { id: { in: taskIds }, projectId },
    data: { assignedTo: assigneeId ?? null },
  });

  return c.json({ data: { count: taskIds.length, assigneeId } });
});

export { projectsRouter };

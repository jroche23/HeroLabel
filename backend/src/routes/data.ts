import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import {
  updateDataColumnSchema,
  reorderColumnsSchema,
  updateTaskDataSchema,
} from "../types";
import { parseFile } from "../utils/fileParser";

// Create router with typed context for auth
const dataRouter = new Hono<{
  Variables: {
    user: any;
    session: any;
  };
}>();

/**
 * POST /api/projects/:projectId/data/upload
 * Upload and parse data file
 */
dataRouter.post(
  "/:projectId/upload",
  zValidator(
    "json",
    z.object({
      fileContent: z.string(),
      fileType: z.string(),
      fileName: z.string(),
    })
  ),
  async (c) => {
    try {
      const user = c.get("user");
      const { projectId } = c.req.param();
      const { fileContent, fileType, fileName } = c.req.valid("json");

      // Verify project exists and user has access
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          userId: user.id,
        },
      });

      if (!project) {
        return c.json({ error: { message: "Project not found", code: "NOT_FOUND" } }, 404);
      }

      // Parse the file
      const { rows, columns } = parseFile(fileContent, fileType);

      if (rows.length === 0) {
        return c.json(
          { error: { message: "No data found in file", code: "INVALID_FILE" } },
          400
        );
      }

      // Create data import record
      const dataImport = await prisma.dataImport.create({
        data: {
          projectId,
          sourceType: "file",
          fileName,
          fileType,
          status: "processing",
        },
      });

      // Store or update column definitions
      const savedColumns = await Promise.all(
        columns.map(async (col, index) => {
          return await prisma.dataColumn.upsert({
            where: {
              projectId_name: {
                projectId,
                name: col.name,
              },
            },
            update: {
              type: col.type,
              displayName: col.displayName,
            },
            create: {
              projectId,
              name: col.name,
              type: col.type,
              displayName: col.displayName,
              visible: true,
              order: index,
            },
          });
        })
      );

      // Create tasks for each row
      const tasks = await Promise.all(
        rows.map(async (row) => {
          // Create task with basic data
          const task = await prisma.task.create({
            data: {
              projectId,
              data: JSON.stringify(row),
              status: "pending",
            },
          });

          // Create associated task data
          await prisma.taskData.create({
            data: {
              taskId: task.id,
              data: JSON.stringify(row),
              columnSchema: JSON.stringify(columns),
            },
          });

          return task;
        })
      );

      // Update data import status
      await prisma.dataImport.update({
        where: { id: dataImport.id },
        data: { status: "completed" },
      });

      // Prepare response
      const response = {
        taskCount: tasks.length,
        columnCount: savedColumns.length,
        columns: savedColumns.map((col) => ({
          id: col.id,
          projectId: col.projectId,
          name: col.name,
          type: col.type,
          displayName: col.displayName,
          visible: col.visible,
          order: col.order,
          createdAt: col.createdAt.toISOString(),
          updatedAt: col.updatedAt.toISOString(),
        })),
        sampleData: rows.slice(0, 5), // Return first 5 rows as sample
      };

      return c.json({ data: response });
    } catch (error) {
      console.error("File upload error:", error);
      return c.json(
        {
          error: {
            message: error instanceof Error ? error.message : "Failed to upload file",
            code: "UPLOAD_FAILED",
          },
        },
        500
      );
    }
  }
);

/**
 * GET /api/projects/:projectId/columns
 * Get column definitions for a project
 */
dataRouter.get("/:projectId/columns", async (c) => {
  try {
    const user = c.get("user");
    const { projectId } = c.req.param();

    // Verify project access (owner or member)
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { userId: user.id },
          { members: { some: { email: user.email } } },
        ],
      },
    });

    if (!project) {
      return c.json({ error: { message: "Project not found", code: "NOT_FOUND" } }, 404);
    }

    // Get columns ordered by order field
    const columns = await prisma.dataColumn.findMany({
      where: { projectId },
      orderBy: { order: "asc" },
    });

    const response = columns.map((col) => ({
      id: col.id,
      projectId: col.projectId,
      name: col.name,
      type: col.type,
      displayName: col.displayName,
      visible: col.visible,
      order: col.order,
      createdAt: col.createdAt.toISOString(),
      updatedAt: col.updatedAt.toISOString(),
    }));

    return c.json({ data: response });
  } catch (error) {
    console.error("Get columns error:", error);
    return c.json(
      {
        error: {
          message: "Failed to get columns",
          code: "GET_COLUMNS_FAILED",
        },
      },
      500
    );
  }
});

/**
 * PUT /api/projects/:projectId/columns/:columnId
 * Update column visibility, order, or display name
 */
dataRouter.put(
  "/:projectId/columns/:columnId",
  zValidator("json", updateDataColumnSchema),
  async (c) => {
    try {
      const user = c.get("user");
      const { projectId, columnId } = c.req.param();
      const updates = c.req.valid("json");

      // Verify project access
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          userId: user.id,
        },
      });

      if (!project) {
        return c.json({ error: { message: "Project not found", code: "NOT_FOUND" } }, 404);
      }

      // Update column
      const column = await prisma.dataColumn.update({
        where: {
          id: columnId,
          projectId,
        },
        data: updates,
      });

      const response = {
        id: column.id,
        projectId: column.projectId,
        name: column.name,
        type: column.type,
        displayName: column.displayName,
        visible: column.visible,
        order: column.order,
        createdAt: column.createdAt.toISOString(),
        updatedAt: column.updatedAt.toISOString(),
      };

      return c.json({ data: response });
    } catch (error) {
      console.error("Update column error:", error);
      return c.json(
        {
          error: {
            message: "Failed to update column",
            code: "UPDATE_COLUMN_FAILED",
          },
        },
        500
      );
    }
  }
);

/**
 * POST /api/projects/:projectId/columns/reorder
 * Reorder columns
 */
dataRouter.post(
  "/:projectId/columns/reorder",
  zValidator("json", reorderColumnsSchema),
  async (c) => {
    try {
      const user = c.get("user");
      const { projectId } = c.req.param();
      const { columnIds } = c.req.valid("json");

      // Verify project access
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          userId: user.id,
        },
      });

      if (!project) {
        return c.json({ error: { message: "Project not found", code: "NOT_FOUND" } }, 404);
      }

      // Update order for each column
      await Promise.all(
        columnIds.map(async (columnId, index) => {
          return await prisma.dataColumn.update({
            where: {
              id: columnId,
              projectId,
            },
            data: { order: index },
          });
        })
      );

      // Get updated columns
      const columns = await prisma.dataColumn.findMany({
        where: { projectId },
        orderBy: { order: "asc" },
      });

      const response = columns.map((col) => ({
        id: col.id,
        projectId: col.projectId,
        name: col.name,
        type: col.type,
        displayName: col.displayName,
        visible: col.visible,
        order: col.order,
        createdAt: col.createdAt.toISOString(),
        updatedAt: col.updatedAt.toISOString(),
      }));

      return c.json({ data: response });
    } catch (error) {
      console.error("Reorder columns error:", error);
      return c.json(
        {
          error: {
            message: "Failed to reorder columns",
            code: "REORDER_COLUMNS_FAILED",
          },
        },
        500
      );
    }
  }
);

/**
 * GET /api/projects/:projectId/tasks
 * Get tasks with dynamic column data (paginated)
 */
dataRouter.get("/:projectId/tasks", async (c) => {
  try {
    const user = c.get("user");
    const { projectId } = c.req.param();
    const page = parseInt(c.req.query("page") || "1");
    const pageSize = parseInt(c.req.query("pageSize") || "50");
    const status = c.req.query("status");
    // When fetching for the labeling interface, apply smarter task visibility
    const forLabeling = c.req.query("forLabeling") === "true";

    // Parse structured filters from query param
    type FilterItem = { column: string; operator: string; value: string };
    let clientFilters: FilterItem[] = [];
    const filtersParam = c.req.query("filters");
    if (filtersParam) {
      try { clientFilters = JSON.parse(filtersParam); } catch { /* ignore */ }
    }

    // Verify project access (owner or member)
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { userId: user.id },
          { members: { some: { email: user.email } } },
        ],
      },
      include: { members: { where: { email: user.email } } },
    });

    if (!project) {
      return c.json({ error: { message: "Project not found", code: "NOT_FOUND" } }, 404);
    }

    // Determine role: owner sees all; restricted roles only see their assigned tasks
    const isOwner = project.userId === user.id;
    const memberRole = project.members[0]?.role ?? null;
    const restrictedRoles = ["ANNOTATOR", "REVIEWER"];
    const isRestricted = !isOwner && memberRole !== null && restrictedRoles.includes(memberRole);

    // Build where clause
    const where: any = { projectId };
    if (status) {
      where.status = status;
    }
    if (isRestricted) {
      if (forLabeling) {
        // In labeling mode: show tasks assigned to this user OR unassigned tasks
        // the user hasn't annotated yet (supports multi-annotation overlap).
        where.status = { not: "completed" };
        where.OR = [
          { assignedTo: user.id },
          {
            assignedTo: null,
            NOT: {
              annotations: { some: { userId: user.id, status: "submitted" } },
            },
          },
        ];
      } else {
        where.assignedTo = user.id;
      }
    }

    // Apply server-side filters for meta columns
    for (const f of clientFilters) {
      if (!f.value) continue;
      const statusNorm = (v: string) =>
        ({ Completed: "completed", Pending: "pending", "In Progress": "in_progress" }[v] ?? v.toLowerCase());

      if (f.column === "task_state") {
        if (f.operator === "equals") where.status = statusNorm(f.value);
        else if (f.operator === "notEquals") where.status = { not: statusNorm(f.value) };
      } else if (f.column === "total_annotations") {
        const n = parseFloat(f.value);
        if (!isNaN(n)) {
          if ((f.operator === "gt" && n === 0) || (f.operator === "gte" && n >= 1) || (f.operator === "equals" && n >= 1)) {
            where.status = "completed";
          } else if (f.operator === "equals" && n === 0) {
            where.status = { not: "completed" };
          } else if ((f.operator === "lt" && n <= 1) || (f.operator === "lte" && n === 0)) {
            where.status = { not: "completed" };
          }
        }
      }
    }

    // Get total count
    const total = await prisma.task.count({ where });

    // Get paginated tasks
    const tasks = await prisma.task.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        taskData: true,
        annotations: {
          where: { status: "submitted" },
          orderBy: { submittedAt: "desc" },
          select: { result: true, comment: true, userId: true, submittedAt: true },
        },
      },
    });

    // Batch-fetch annotator users for any submitted annotations
    const annotatorIds = [...new Set(
      tasks.flatMap((t) => t.annotations.map((a) => a.userId)).filter(Boolean) as string[]
    )];
    const annotatorUsers = annotatorIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: annotatorIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
    const annotatorMap = new Map(annotatorUsers.map((u) => [u.id, u]));

    // Get columns
    const columns = await prisma.dataColumn.findMany({
      where: { projectId },
      orderBy: { order: "asc" },
    });

    // Compute basic agreement score for a set of annotations
    function computeAgreement(annotations: Array<{ result: string | null }>): number | null {
      if (annotations.length < 2) return null;
      // Extract the primary choice from each annotation
      const choices: string[] = [];
      for (const ann of annotations) {
        if (!ann.result) continue;
        try {
          const results = JSON.parse(ann.result) as Array<{ type: string; value: { choices: string[] } }>;
          const choiceResult = results.find((r) => r.type === "choices");
          const choice = choiceResult?.value?.choices?.[0];
          if (choice) choices.push(choice);
        } catch { /* ignore */ }
      }
      if (choices.length < 2) return null;
      const counts: Record<string, number> = {};
      for (const c of choices) counts[c] = (counts[c] ?? 0) + 1;
      const maxCount = Math.max(...Object.values(counts));
      return Math.round((maxCount / choices.length) * 100);
    }

    // Format response
    const formattedTasks = tasks.map((task) => {
      let data: Record<string, any> = {};
      try {
        data = task.taskData ? JSON.parse(task.taskData.data) : JSON.parse(task.data);
      } catch {
        data = {};
      }

      const totalAnnotations = task.annotations.length;

      // Extract label + reasoning from latest annotation result
      let annotationLabel: string | null = null;
      let annotationReasoning: string[] | null = null;
      let annotationComment: string | null = null;
      let annotatedAt: string | null = null;
      let annotatorName: string | null = null;
      let annotatorEmail: string | null = null;

      const latestAnnotation = task.annotations[0];
      if (latestAnnotation) {
        annotationComment = latestAnnotation.comment ?? null;
        annotatedAt = latestAnnotation.submittedAt?.toISOString() ?? null;
        const annotatorUser = annotatorMap.get(latestAnnotation.userId);
        annotatorName = annotatorUser?.name ?? null;
        annotatorEmail = annotatorUser?.email ?? null;

        if (latestAnnotation.result) {
          try {
            const results = JSON.parse(latestAnnotation.result) as Array<{
              type: string;
              value: { choices: string[] };
            }>;
            const choiceResult = results.find((r) => r.type === "choices");
            annotationLabel = choiceResult?.value?.choices?.[0] ?? null;
            const taxonomyResult = results.find((r) => r.type === "taxonomy");
            annotationReasoning = taxonomyResult?.value?.choices ?? null;
          } catch {
            // ignore parse errors
          }
        }
      }

      // Agreement score (only meaningful with ≥2 annotations)
      const agreement = computeAgreement(task.annotations);

      return {
        id: task.id,
        projectId: task.projectId,
        status: task.status,
        assignedTo: task.assignedTo,
        assignedUser: task.assignedUser || null,
        totalAnnotations,
        agreement,
        annotationLabel,
        annotationReasoning,
        annotationComment,
        annotatedAt,
        annotatorName,
        annotatorEmail,
        data,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
      };
    });

    const response = {
      tasks: formattedTasks,
      columns: columns.map((col) => ({
        id: col.id,
        projectId: col.projectId,
        name: col.name,
        type: col.type,
        displayName: col.displayName,
        visible: col.visible,
        order: col.order,
        createdAt: col.createdAt.toISOString(),
        updatedAt: col.updatedAt.toISOString(),
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };

    return c.json({ data: response });
  } catch (error) {
    console.error("Get tasks error:", error);
    return c.json(
      {
        error: {
          message: "Failed to get tasks",
          code: "GET_TASKS_FAILED",
        },
      },
      500
    );
  }
});

/**
 * GET /api/projects/:projectId/tasks/:taskId
 * Fetch a single task by ID (used when navigating directly to a task)
 */
dataRouter.get("/:projectId/tasks/:taskId", async (c) => {
  try {
    const user = c.get("user");
    const { projectId, taskId } = c.req.param();

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [{ userId: user.id }, { members: { some: { email: user.email } } }],
      },
    });
    if (!project) {
      return c.json({ error: { message: "Project not found", code: "NOT_FOUND" } }, 404);
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignedUser: { select: { id: true, name: true, email: true } },
        taskData: true,
        annotations: {
          where: { status: "submitted" },
          orderBy: { submittedAt: "desc" },
          take: 1,
          select: { result: true, comment: true, userId: true, submittedAt: true },
        },
      },
    });

    if (!task || task.projectId !== projectId) {
      return c.json({ error: { message: "Task not found", code: "NOT_FOUND" } }, 404);
    }

    let data: Record<string, any> = {};
    try { data = task.taskData ? JSON.parse(task.taskData.data) : JSON.parse(task.data); } catch { data = {}; }

    return c.json({
      data: {
        id: task.id,
        projectId: task.projectId,
        status: task.status,
        assignedTo: task.assignedTo,
        assignedUser: task.assignedUser || null,
        annotationLabel: null,
        annotationReasoning: null,
        annotationComment: null,
        annotatedAt: null,
        annotatorName: null,
        annotatorEmail: null,
        data,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    return c.json({ error: { message: "Failed to fetch task", code: "GET_TASK_FAILED" } }, 500);
  }
});

/**
 * PUT /api/projects/:projectId/tasks/:taskId
 * Update task data
 */
dataRouter.put(
  "/:projectId/tasks/:taskId",
  zValidator("json", updateTaskDataSchema),
  async (c) => {
    try {
      const user = c.get("user");
      const { projectId, taskId } = c.req.param();
      const { data } = c.req.valid("json");

      // Verify project access
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          userId: user.id,
        },
      });

      if (!project) {
        return c.json({ error: { message: "Project not found", code: "NOT_FOUND" } }, 404);
      }

      // Update task data
      const task = await prisma.task.update({
        where: {
          id: taskId,
          projectId,
        },
        data: {
          data: JSON.stringify(data),
        },
        include: {
          taskData: true,
          assignedUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Update task data if it exists
      if (task.taskData) {
        await prisma.taskData.update({
          where: { taskId },
          data: {
            data: JSON.stringify(data),
          },
        });
      }

      const response = {
        id: task.id,
        projectId: task.projectId,
        status: task.status,
        assignedTo: task.assignedTo,
        assignedUser: task.assignedUser || null,
        data,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
      };

      return c.json({ data: response });
    } catch (error) {
      console.error("Update task error:", error);
      return c.json(
        {
          error: {
            message: "Failed to update task",
            code: "UPDATE_TASK_FAILED",
          },
        },
        500
      );
    }
  }
);

/**
 * DELETE /api/projects/:projectId/tasks/:taskId
 * Delete a task
 */
dataRouter.delete("/:projectId/tasks/:taskId", async (c) => {
  try {
    const user = c.get("user");
    const { projectId, taskId } = c.req.param();

    // Verify project access
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: user.id,
      },
    });

    if (!project) {
      return c.json({ error: { message: "Project not found", code: "NOT_FOUND" } }, 404);
    }

    // Delete task (cascade will delete task data)
    await prisma.task.delete({
      where: {
        id: taskId,
        projectId,
      },
    });

    return c.json({ data: { success: true } });
  } catch (error) {
    console.error("Delete task error:", error);
    return c.json(
      {
        error: {
          message: "Failed to delete task",
          code: "DELETE_TASK_FAILED",
        },
      },
      500
    );
  }
});

export { dataRouter };

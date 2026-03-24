import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { prisma } from "../prisma";
import { performanceQuerySchema } from "../types";

// Create router with typed context for auth
const performanceRouter = new Hono<{
  Variables: {
    user: any;
    session: any;
  };
}>();

// Auth middleware - require authentication for all routes
performanceRouter.use("*", async (c, next) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
  }
  await next();
});

// Helper function to calculate median
function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

// Helper function to build date filter
function buildDateFilter(startDate?: string, endDate?: string) {
  const dateFilter: any = {};
  if (startDate) {
    dateFilter.gte = new Date(startDate);
  }
  if (endDate) {
    // Add one day to include the end date
    const end = new Date(endDate);
    end.setDate(end.getDate() + 1);
    dateFilter.lt = end;
  }
  return Object.keys(dateFilter).length > 0 ? dateFilter : undefined;
}

// GET /api/performance/overview - Get user's performance metrics
performanceRouter.get(
  "/overview",
  zValidator("query", performanceQuerySchema),
  async (c) => {
    const currentUser = c.get("user");
    const { userId, workspaceId, projectId, startDate, endDate } = c.req.valid("query");

    // Use the provided userId or default to current user
    const targetUserId = userId || currentUser.id;

    // Build filter
    const filter: any = {
      userId: targetUserId,
    };

    if (projectId) {
      filter.projectId = projectId;
    }

    const dateFilter = buildDateFilter(startDate, endDate);
    if (dateFilter) {
      filter.submittedAt = dateFilter;
    }

    // Get all annotations for the user
    const annotations = await prisma.annotation.findMany({
      where: filter,
      include: {
        reviews: true,
      },
    });

    // Calculate metrics
    const totalSubmitted = annotations.filter((a) => a.status === "submitted").length;
    const totalSkipped = annotations.filter((a) => a.status === "skipped").length;
    const totalPending = annotations.filter((a) => a.status === "pending").length;

    // Calculate time annotating (convert to hours)
    const totalTimeMinutes = annotations.reduce((sum, a) => sum + a.timeSpent, 0);
    const timeAnnotating = totalTimeMinutes / 60;

    // Calculate review metrics
    const allReviews = annotations.flatMap((a) => a.reviews);
    const totalReviewed = allReviews.length;
    const acceptedCount = allReviews.filter((r) => r.status === "accepted").length;
    const fixAcceptedCount = allReviews.filter((r) => r.status === "fix_accepted").length;
    const rejectedCount = allReviews.filter((r) => r.status === "rejected").length;

    // Calculate performance score
    const performanceScore =
      totalReviewed > 0
        ? ((acceptedCount + fixAcceptedCount) / totalReviewed) * 100
        : 0;

    return c.json({
      data: {
        totalSubmitted,
        totalSkipped,
        totalPending,
        timeAnnotating: Number(timeAnnotating.toFixed(2)),
        performanceScore: Number(performanceScore.toFixed(2)),
        totalReviewed,
        acceptedCount,
        fixAcceptedCount,
        rejectedCount,
      },
    });
  }
);

// GET /api/performance/timeline - Get annotation states over time
performanceRouter.get(
  "/timeline",
  zValidator("query", performanceQuerySchema),
  async (c) => {
    const currentUser = c.get("user");
    const { userId, workspaceId, projectId, startDate, endDate } = c.req.valid("query");

    const targetUserId = userId || currentUser.id;

    // Build filter
    const filter: any = {
      userId: targetUserId,
      status: { in: ["submitted", "skipped"] },
    };

    if (projectId) {
      filter.projectId = projectId;
    }

    const dateFilter = buildDateFilter(startDate, endDate);
    if (dateFilter) {
      filter.submittedAt = dateFilter;
    }

    // Get all annotations
    const annotations = await prisma.annotation.findMany({
      where: filter,
      orderBy: {
        submittedAt: "asc",
      },
    });

    // Group by date
    const timelineMap = new Map<
      string,
      { date: string; submitted: number; skipped: number }
    >();

    annotations.forEach((annotation) => {
      if (!annotation.submittedAt) return;

      const date = annotation.submittedAt.toISOString().split("T")[0];
      const existing = timelineMap.get(date) || {
        date,
        submitted: 0,
        skipped: 0,
      };

      if (annotation.status === "submitted") {
        existing.submitted++;
      } else if (annotation.status === "skipped") {
        existing.skipped++;
      }

      timelineMap.set(date, existing);
    });

    const timeline = Array.from(timelineMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    return c.json({ data: timeline });
  }
);

// GET /api/performance/time-spent - Get time spent annotating by date
performanceRouter.get(
  "/time-spent",
  zValidator("query", performanceQuerySchema),
  async (c) => {
    const currentUser = c.get("user");
    const { userId, workspaceId, projectId, startDate, endDate } = c.req.valid("query");

    const targetUserId = userId || currentUser.id;

    // Build filter
    const filter: any = {
      userId: targetUserId,
      status: { in: ["submitted", "skipped"] },
    };

    if (projectId) {
      filter.projectId = projectId;
    }

    const dateFilter = buildDateFilter(startDate, endDate);
    if (dateFilter) {
      filter.submittedAt = dateFilter;
    }

    // Get all annotations with time spent
    const annotations = await prisma.annotation.findMany({
      where: filter,
      orderBy: {
        submittedAt: "asc",
      },
    });

    // Group by date
    const timeSpentMap = new Map<
      string,
      { date: string; totalTime: number; count: number }
    >();

    annotations.forEach((annotation) => {
      if (!annotation.submittedAt) return;

      const date = annotation.submittedAt.toISOString().split("T")[0];
      const existing = timeSpentMap.get(date) || {
        date,
        totalTime: 0,
        count: 0,
      };

      existing.totalTime += annotation.timeSpent;
      existing.count++;

      timeSpentMap.set(date, existing);
    });

    const timeSpentData = Array.from(timeSpentMap.values())
      .map((item) => ({
        date: item.date,
        avgTimePerAnnotation: Number((item.totalTime / item.count).toFixed(2)),
        totalTimeHours: Number((item.totalTime / 60).toFixed(2)),
        annotationCount: item.count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return c.json({ data: timeSpentData });
  }
);

// GET /api/performance/annotators - Get all annotators performance table data
performanceRouter.get(
  "/annotators",
  zValidator("query", performanceQuerySchema),
  async (c) => {
    const currentUser = c.get("user");
    const { workspaceId, projectId, startDate, endDate } = c.req.valid("query");

    // Build filter for annotations
    const annotationFilter: any = {};

    if (projectId) {
      annotationFilter.projectId = projectId;
    }

    const dateFilter = buildDateFilter(startDate, endDate);
    if (dateFilter) {
      annotationFilter.submittedAt = dateFilter;
    }

    // Get all annotations with reviews and user data
    const annotations = await prisma.annotation.findMany({
      where: annotationFilter,
      include: {
        reviews: true,
        task: {
          include: {
            assignedUser: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
      },
    });

    // Get all users who have annotations or assigned tasks
    const userIds = new Set<string>();
    annotations.forEach((a) => {
      userIds.add(a.userId);
      if (a.task.assignedTo) {
        userIds.add(a.task.assignedTo);
      }
    });

    // Get user details
    const users = await prisma.user.findMany({
      where: {
        id: { in: Array.from(userIds) },
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });

    // Calculate performance for each user
    const performanceData = users.map((user) => {
      const userAnnotations = annotations.filter((a) => a.userId === user.id);
      const assignedTasks = annotations.filter((a) => a.task.assignedTo === user.id);

      const assigned = assignedTasks.length;
      const pending = userAnnotations.filter((a) => a.status === "pending").length;
      const submitted = userAnnotations.filter((a) => a.status === "submitted").length;
      const skipped = userAnnotations.filter((a) => a.status === "skipped").length;

      // Calculate review metrics
      const allReviews = userAnnotations.flatMap((a) => a.reviews);
      const totalReviewed = allReviews.length;
      const accepted = allReviews.filter((r) => r.status === "accepted").length;
      const fixAccepted = allReviews.filter((r) => r.status === "fix_accepted").length;
      const rejected = allReviews.filter((r) => r.status === "rejected").length;

      const performanceScore =
        totalReviewed > 0 ? ((accepted + fixAccepted) / totalReviewed) * 100 : 0;

      // Calculate time metrics
      const timeSpentValues = userAnnotations.map((a) => a.timeSpent);
      const totalTimeMinutes = timeSpentValues.reduce((sum, t) => sum + t, 0);
      const totalTime = totalTimeMinutes / 60;
      const avgTime = timeSpentValues.length > 0 ? totalTimeMinutes / timeSpentValues.length : 0;
      const medianTime = calculateMedian(timeSpentValues);

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        },
        assigned,
        pending,
        submitted,
        skipped,
        performanceScore: Number(performanceScore.toFixed(2)),
        accepted,
        fixAccepted,
        rejected,
        totalTime: Number(totalTime.toFixed(2)),
        avgTime: Number(avgTime.toFixed(2)),
        medianTime: Number(medianTime.toFixed(2)),
      };
    });

    // Sort by performance score descending
    performanceData.sort((a, b) => b.performanceScore - a.performanceScore);

    return c.json({ data: performanceData });
  }
);

export { performanceRouter };

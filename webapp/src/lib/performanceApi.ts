import {
  type PerformanceOverview,
  type PerformanceTimelinePoint,
  type TimeSpentDataPoint,
  type AnnotatorPerformance,
  type PerformanceQuery,
  performanceOverviewSchema,
  performanceTimelinePointSchema,
  timeSpentDataPointSchema,
  annotatorPerformanceSchema,
} from "../../../backend/src/types";

const baseUrl = import.meta.env.VITE_BACKEND_URL || "";

export interface PerformanceApiParams {
  userId?: string;
  workspaceId?: string;
  projectId?: string;
  startDate?: string;
  endDate?: string;
}

function buildQueryString(params: PerformanceApiParams): string {
  const searchParams = new URLSearchParams();
  if (params.userId) searchParams.append("userId", params.userId);
  if (params.workspaceId) searchParams.append("workspaceId", params.workspaceId);
  if (params.projectId) searchParams.append("projectId", params.projectId);
  if (params.startDate) searchParams.append("startDate", params.startDate);
  if (params.endDate) searchParams.append("endDate", params.endDate);
  return searchParams.toString();
}

export async function getPerformanceOverview(
  params: PerformanceApiParams = {}
): Promise<PerformanceOverview> {
  const queryString = buildQueryString(params);
  const url = `${baseUrl}/api/performance/overview${queryString ? `?${queryString}` : ""}`;
  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch performance overview: ${response.statusText}`);
  }

  const json = await response.json();
  return performanceOverviewSchema.parse(json.data);
}

export async function getPerformanceTimeline(
  params: PerformanceApiParams = {}
): Promise<PerformanceTimelinePoint[]> {
  const queryString = buildQueryString(params);
  const url = `${baseUrl}/api/performance/timeline${queryString ? `?${queryString}` : ""}`;
  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch performance timeline: ${response.statusText}`);
  }

  const json = await response.json();
  return json.data.map((item: unknown) => performanceTimelinePointSchema.parse(item));
}

export async function getTimeSpentData(
  params: PerformanceApiParams = {}
): Promise<TimeSpentDataPoint[]> {
  const queryString = buildQueryString(params);
  const url = `${baseUrl}/api/performance/time-spent${queryString ? `?${queryString}` : ""}`;
  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch time spent data: ${response.statusText}`);
  }

  const json = await response.json();
  return json.data.map((item: unknown) => timeSpentDataPointSchema.parse(item));
}

export async function getAnnotatorsPerformance(
  params: PerformanceApiParams = {}
): Promise<AnnotatorPerformance[]> {
  const queryString = buildQueryString(params);
  const url = `${baseUrl}/api/performance/annotators${queryString ? `?${queryString}` : ""}`;
  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch annotators performance: ${response.statusText}`);
  }

  const json = await response.json();
  return json.data.map((item: unknown) => annotatorPerformanceSchema.parse(item));
}

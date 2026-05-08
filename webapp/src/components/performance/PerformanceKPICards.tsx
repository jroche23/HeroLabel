import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import type { PerformanceOverview } from "@/types/shared";

interface PerformanceKPICardsProps {
  data: PerformanceOverview;
  isLoading?: boolean;
}

export function PerformanceKPICards({ data, isLoading }: PerformanceKPICardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-20 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Total Submitted Annotations */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Submitted Annotations
          </CardTitle>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs text-xs">
                Total number of annotations submitted by this user
              </p>
            </TooltipContent>
          </Tooltip>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.totalSubmitted.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {data.totalSkipped.toLocaleString()} Skipped
          </p>
        </CardContent>
      </Card>

      {/* Time Annotating */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Time Annotating</CardTitle>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs text-xs">
                Total time spent annotating tasks
              </p>
            </TooltipContent>
          </Tooltip>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {data.timeAnnotating.toFixed(1)}h
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Across all tasks
          </p>
        </CardContent>
      </Card>

      {/* Performance Score */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Performance Score
          </CardTitle>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs text-xs">
                Calculated based on accuracy and task completion rate
              </p>
            </TooltipContent>
          </Tooltip>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {data.performanceScore.toFixed(1)}%
          </div>
          <Progress
            value={data.performanceScore}
            className="mt-2 h-2"
          />
        </CardContent>
      </Card>
    </div>
  );
}

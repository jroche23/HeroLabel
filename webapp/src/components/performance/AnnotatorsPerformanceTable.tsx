import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Info, ArrowUpDown, ChevronDown } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AnnotatorPerformance } from "@/types/shared";

interface AnnotatorsPerformanceTableProps {
  data: AnnotatorPerformance[];
  isLoading?: boolean;
}

type SortField =
  | "user"
  | "assigned"
  | "pending"
  | "submitted"
  | "skipped"
  | "performanceScore"
  | "accepted"
  | "fixAccepted"
  | "rejected"
  | "totalTime"
  | "avgTime"
  | "medianTime";

type SortOrder = "asc" | "desc";

interface ColumnConfig {
  key: string;
  label: string;
  tooltip?: string;
  visible: boolean;
}

export function AnnotatorsPerformanceTable({
  data,
  isLoading,
}: AnnotatorsPerformanceTableProps) {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { key: "user", label: "User", visible: true },
    { key: "assigned", label: "Assigned", tooltip: "Total tasks assigned", visible: true },
    { key: "pending", label: "Pending", tooltip: "Tasks not yet started", visible: true },
    { key: "submitted", label: "Submitted", tooltip: "Tasks submitted for review", visible: true },
    { key: "skipped", label: "Skipped", tooltip: "Tasks skipped", visible: true },
    { key: "performanceScore", label: "Performance Score", tooltip: "Overall performance rating", visible: true },
    { key: "accepted", label: "Accepted", tooltip: "Tasks accepted by reviewer", visible: true },
    { key: "fixAccepted", label: "Fix + Accepted", tooltip: "Tasks fixed and accepted", visible: true },
    { key: "rejected", label: "Rejected", tooltip: "Tasks rejected by reviewer", visible: true },
    { key: "totalTime", label: "Total Time", tooltip: "Total time spent (hours)", visible: true },
    { key: "avgTime", label: "Avg Time", tooltip: "Average time per task (minutes)", visible: true },
    { key: "medianTime", label: "Median Time", tooltip: "Median time per task (minutes)", visible: true },
  ]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const toggleColumn = (key: string) => {
    setColumns(
      columns.map((col) =>
        col.key === key ? { ...col, visible: !col.visible } : col
      )
    );
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortField) return 0;

    let aValue: number | string = 0;
    let bValue: number | string = 0;

    if (sortField === "user") {
      aValue = a.user.name.toLowerCase();
      bValue = b.user.name.toLowerCase();
    } else {
      aValue = a[sortField] as number;
      bValue = b[sortField] as number;
    }

    if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
    if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const visibleColumnCount = columns.filter((col) => col.visible).length;

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <div className="p-8">
          <div className="h-64 animate-pulse rounded bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Annotators Performance</h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Columns ({visibleColumnCount})
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {columns.map((column) => (
              <DropdownMenuCheckboxItem
                key={column.key}
                checked={column.visible}
                onCheckedChange={() => toggleColumn(column.key)}
                disabled={column.key === "user"}
              >
                {column.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns
                .filter((col) => col.visible)
                .map((column) => (
                  <TableHead key={column.key}>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8 data-[state=open]:bg-accent"
                        onClick={() => handleSort(column.key as SortField)}
                      >
                        {column.label}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                      {column.tooltip ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs text-xs">{column.tooltip}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : null}
                    </div>
                  </TableHead>
                ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={visibleColumnCount}
                  className="h-24 text-center"
                >
                  No annotators found.
                </TableCell>
              </TableRow>
            ) : (
              sortedData.map((annotator) => (
                <TableRow key={annotator.user.id}>
                  {columns.find((c) => c.key === "user" && c.visible) ? (
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={annotator.user.image ?? undefined} />
                          <AvatarFallback>
                            {annotator.user.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {annotator.user.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {annotator.user.email}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                  ) : null}
                  {columns.find((c) => c.key === "assigned" && c.visible) ? (
                    <TableCell>{annotator.assigned}</TableCell>
                  ) : null}
                  {columns.find((c) => c.key === "pending" && c.visible) ? (
                    <TableCell>{annotator.pending}</TableCell>
                  ) : null}
                  {columns.find((c) => c.key === "submitted" && c.visible) ? (
                    <TableCell>{annotator.submitted}</TableCell>
                  ) : null}
                  {columns.find((c) => c.key === "skipped" && c.visible) ? (
                    <TableCell>{annotator.skipped}</TableCell>
                  ) : null}
                  {columns.find((c) => c.key === "performanceScore" && c.visible) ? (
                    <TableCell className="font-medium">
                      {annotator.performanceScore.toFixed(1)}%
                    </TableCell>
                  ) : null}
                  {columns.find((c) => c.key === "accepted" && c.visible) ? (
                    <TableCell>{annotator.accepted}</TableCell>
                  ) : null}
                  {columns.find((c) => c.key === "fixAccepted" && c.visible) ? (
                    <TableCell>{annotator.fixAccepted}</TableCell>
                  ) : null}
                  {columns.find((c) => c.key === "rejected" && c.visible) ? (
                    <TableCell>{annotator.rejected}</TableCell>
                  ) : null}
                  {columns.find((c) => c.key === "totalTime" && c.visible) ? (
                    <TableCell>
                      {annotator.totalTime > 0
                        ? `${annotator.totalTime.toFixed(1)}h`
                        : "—"}
                    </TableCell>
                  ) : null}
                  {columns.find((c) => c.key === "avgTime" && c.visible) ? (
                    <TableCell>
                      {annotator.avgTime > 0
                        ? `${annotator.avgTime.toFixed(1)}m`
                        : "—"}
                    </TableCell>
                  ) : null}
                  {columns.find((c) => c.key === "medianTime" && c.visible) ? (
                    <TableCell>
                      {annotator.medianTime > 0
                        ? `${annotator.medianTime.toFixed(1)}m`
                        : "—"}
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

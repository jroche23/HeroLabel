import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDown, Download, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { PerformanceKPICards } from "@/components/performance/PerformanceKPICards";
import { PerformanceCharts } from "@/components/performance/PerformanceCharts";
import { AnnotatorsPerformanceTable } from "@/components/performance/AnnotatorsPerformanceTable";
import {
  getPerformanceOverview,
  getPerformanceTimeline,
  getTimeSpentData,
  getAnnotatorsPerformance,
  type PerformanceApiParams,
} from "@/lib/performanceApi";

export default function PerformanceDashboardPage() {
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{
    from: Date;
    to: Date;
  }>({
    from: new Date(2026, 1, 1), // Feb 1, 2026
    to: new Date(2026, 1, 7), // Feb 7, 2026
  });
  const [activeTab, setActiveTab] = useState<string>("annotations");

  // Build query params
  const queryParams: PerformanceApiParams = {
    userId: selectedUser !== "all" ? selectedUser : undefined,
    workspaceId: selectedWorkspace !== "all" ? selectedWorkspace : undefined,
    startDate: dateRange.from.toISOString(),
    endDate: dateRange.to.toISOString(),
  };

  // Fetch performance data
  const { data: overviewData, isLoading: overviewLoading } = useQuery({
    queryKey: ["performance-overview", queryParams],
    queryFn: () => getPerformanceOverview(queryParams),
  });

  const { data: timelineData, isLoading: timelineLoading } = useQuery({
    queryKey: ["performance-timeline", queryParams],
    queryFn: () => getPerformanceTimeline(queryParams),
  });

  const { data: timeSpentData, isLoading: timeSpentLoading } = useQuery({
    queryKey: ["performance-time-spent", queryParams],
    queryFn: () => getTimeSpentData(queryParams),
  });

  const { data: annotatorsData, isLoading: annotatorsLoading } = useQuery({
    queryKey: ["performance-annotators", queryParams],
    queryFn: () => getAnnotatorsPerformance(queryParams),
  });

  const handleApplyFilters = () => {
    // Filters are automatically applied via query params
    // This button is mainly for UX feedback
  };

  const handleExport = (format: string) => {
    // TODO: Implement export functionality
    console.log(`Exporting as ${format}`);
  };

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">
            Member Performance Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Track and analyze annotation performance across your team
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 rounded-lg border bg-card p-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-1 flex-col gap-4 md:flex-row md:items-end">
            {/* User Selector */}
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">User</label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="user1">John Doe</SelectItem>
                  <SelectItem value="user2">Jane Smith</SelectItem>
                  <SelectItem value="user3">Bob Johnson</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Workspace Filter */}
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Workspace</label>
              <Select
                value={selectedWorkspace}
                onValueChange={setSelectedWorkspace}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select workspace" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Workspaces</SelectItem>
                  <SelectItem value="ws1">Product Annotations</SelectItem>
                  <SelectItem value="ws2">Customer Feedback</SelectItem>
                  <SelectItem value="ws3">Image Classification</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Picker */}
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateRange && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "MMM d, yyyy")} -{" "}
                          {format(dateRange.to, "MMM d, yyyy")}
                        </>
                      ) : (
                        format(dateRange.from, "MMM d, yyyy")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={{
                      from: dateRange.from,
                      to: dateRange.to,
                    }}
                    onSelect={(range) => {
                      if (range?.from && range?.to) {
                        setDateRange({ from: range.from, to: range.to });
                      }
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex items-end gap-2">
            <Button onClick={handleApplyFilters}>Apply</Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport("csv")}>
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("excel")}>
                  Export as Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("pdf")}>
                  Export as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="annotations">Annotations</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
          </TabsList>

          <TabsContent value="annotations" className="space-y-6 mt-6">
            {/* KPI Cards */}
            <PerformanceKPICards
              data={overviewData ?? {
                totalSubmitted: 0,
                totalSkipped: 0,
                totalPending: 0,
                timeAnnotating: 0,
                performanceScore: 0,
                totalReviewed: 0,
                acceptedCount: 0,
                fixAcceptedCount: 0,
                rejectedCount: 0,
              }}
              isLoading={overviewLoading}
            />

            {/* Charts */}
            <PerformanceCharts
              timelineData={timelineData ?? []}
              timeSpentData={timeSpentData ?? []}
              isLoading={timelineLoading || timeSpentLoading}
            />

            {/* Annotators Table */}
            <AnnotatorsPerformanceTable
              data={annotatorsData ?? []}
              isLoading={annotatorsLoading}
            />
          </TabsContent>

          <TabsContent value="reviews" className="space-y-6 mt-6">
            <div className="rounded-md border bg-card p-12 text-center">
              <h3 className="text-lg font-semibold mb-2">Reviews Tab</h3>
              <p className="text-muted-foreground">
                Review performance metrics will be displayed here
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

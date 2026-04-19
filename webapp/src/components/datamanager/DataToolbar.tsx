import { Link } from 'react-router-dom';
import {
  ChevronDown,
  Filter,
  ArrowUpDown,
  Upload,
  Download,
  Play,
  Tag,
  Tags,
  Settings2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import type { LocalDataColumn } from '@/components/data/DynamicDataTable';

// Export types for backward compatibility with TaskTable
export type SortField = 'id' | 'completedCount' | 'createdAt';

export type ColumnKey =
  | 'id'
  | 'completedCount'
  | 'cancelledCount'
  | 'predictionsCount'
  | 'annotators'
  | 'agreement'
  | 'search_query'
  | 'html';

interface DataToolbarProps {
  projectId: string;
  selectedCount: number;
  filtersCount: number;
  sortColumnKey: string | null;
  sortDirection: 'asc' | 'desc';
  sortableColumns: LocalDataColumn[];
  onOpenUpload: () => void;
  onOpenColumns: () => void;
  onOpenFilters: () => void;
  onChangeOrderBy: (columnKey: string, direction: 'asc' | 'desc') => void;
  onBulkLabel: () => void;
  onAssignAnnotator: () => void;
}

export function DataToolbar({
  projectId,
  selectedCount,
  filtersCount,
  sortColumnKey,
  sortDirection,
  sortableColumns,
  onOpenUpload,
  onOpenColumns,
  onOpenFilters,
  onChangeOrderBy,
  onBulkLabel,
  onAssignAnnotator,
}: DataToolbarProps) {
  const metaKeys = new Set([
    'inner_id',
    'task_state',
    'annotation_completed_at',
    'annotations',
    'cancelled',
    'predictions',
    'ground_truth',
    'annotators',
    'annotation_results',
    'annotation_ids',
    'agreement',
    'agreement_selected',
    'reviewers',
    'reviewed',
    'reviews_accepted',
    'reviews_rejected',
    'comment_texts',
    'comments',
    'unresolved_comments',
    'comment_authors',
    'commented_at',
    'review_time',
    'allow_skip',
    'prediction_score',
    'prediction_model_versions',
    'prediction_results',
    'upload_filename',
    'storage_filename',
    'created_at',
    'updated_at',
    'updated_by',
    'lead_time',
    'drafts',
  ]);

  const dataColumns = sortableColumns.filter((c) => !metaKeys.has(c.key));
  const metaColumns = sortableColumns.filter((c) => metaKeys.has(c.key));
  const orderedColumns = [...dataColumns, ...metaColumns];

  const currentColumn = orderedColumns.find((c) => c.key === sortColumnKey) ?? null;

  return (
    <div className="flex items-center justify-between gap-2 border-b border-border bg-card px-4 py-2">
      {/* Left side */}
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={selectedCount === 0}
              className="h-7 text-xs"
            >
              Actions
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Bulk Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              Delete selected
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onAssignAnnotator}>
              Assign annotator
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={onOpenColumns}
        >
          <Settings2 className="mr-1 h-3 w-3" />
          Columns
          <ChevronDown className="ml-1 h-3 w-3" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={onOpenFilters}
        >
          <Filter className="mr-1 h-3 w-3" />
          Filters
          {filtersCount > 0 ? (
            <span className="ml-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground px-1">
              {filtersCount}
            </span>
          ) : null}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled={orderedColumns.length === 0}
            >
              <ArrowUpDown className="mr-1 h-3 w-3" />
              {currentColumn ? currentColumn.name : 'Order by'}
              {sortColumnKey && (
                <span className="ml-1 text-[10px] text-muted-foreground">
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Order by</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {orderedColumns.map((column) => {
              const isActive = column.key === sortColumnKey;
              const nextDirection: 'asc' | 'desc' =
                isActive && sortDirection === 'asc' ? 'desc' : 'asc';
              return (
                <DropdownMenuItem
                  key={column.id}
                  onClick={() => onChangeOrderBy(column.key, nextDirection)}
                  className="flex items-center justify-between text-xs"
                >
                  <span>
                    {column.name}
                    {!metaKeys.has(column.key) ? ' (data)' : ''}
                  </span>
                  {isActive && (
                    <span className="text-[10px] text-muted-foreground">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="h-7 text-xs hidden md:inline-flex">
          <Play className="mr-1 h-3 w-3" />
          Review All Tasks
        </Button>

        {/* Label split button */}
        <div className="flex items-stretch">
          <Button
            asChild
            size="sm"
            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-r-none border-r border-emerald-700"
          >
            <Link to={`/projects/${projectId}/label`}>
              <Tag className="mr-1 h-3 w-3" />
              Label All Tasks
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                className="h-7 w-6 p-0 bg-emerald-600 hover:bg-emerald-700 text-white rounded-l-none"
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem asChild>
                <Link to={`/projects/${projectId}/label`} className="flex items-center gap-2 text-xs">
                  <Tag className="h-3.5 w-3.5" />
                  Label tasks as displayed
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onBulkLabel}
                className="flex items-center gap-2 text-xs"
              >
                <Tags className="h-3.5 w-3.5" />
                Bulk label
                {selectedCount > 0 && (
                  <span className="ml-auto text-[10px] text-muted-foreground">{selectedCount} selected</span>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs hidden md:inline-flex"
          onClick={onOpenUpload}
        >
          <Upload className="mr-1 h-3 w-3" />
          Import
        </Button>
        <Button variant="outline" size="sm" className="h-7 text-xs hidden md:inline-flex">
          <Download className="mr-1 h-3 w-3" />
          Export
        </Button>
      </div>
    </div>
  );
}

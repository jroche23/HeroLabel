import { useState, useCallback } from 'react';
import { MoreHorizontal, ArrowUpDown, CheckCircle2, XCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import type { Task } from '@/types';

// Local column type for the data table
export interface LocalDataColumn {
  id: string;
  name: string;
  key: string;
  type: string;
  visible: boolean;
  order: number;
}

interface DynamicDataTableProps {
  tasks: Task[];
  columns: LocalDataColumn[];
  selectedIds: Set<string>;
  onToggleSelect: (taskId: string) => void;
  onSelectAll: () => void;
  onDeleteTask?: (taskId: string) => void;
  projectId: string;
  sortColumn?: string | null;
  sortDirection?: 'asc' | 'desc';
  onSortChange?: (columnKey: string) => void;
}

// Default column widths in pixels
const DEFAULT_COL_WIDTH = 160;
const FIXED_CHECKBOX_W = 44;
const FIXED_ID_W = 88;
const FIXED_ACTIONS_W = 52;

export function DynamicDataTable({
  tasks,
  columns,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onDeleteTask,
  projectId,
  sortColumn,
  sortDirection,
  onSortChange,
}: DynamicDataTableProps) {
  const navigate = useNavigate();
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});

  const visibleColumns = columns.filter((col) => col.visible).sort((a, b) => a.order - b.order);

  const getWidth = useCallback(
    (col: LocalDataColumn) => columnWidths[col.id] ?? DEFAULT_COL_WIDTH,
    [columnWidths],
  );

  const startResize = useCallback((e: React.MouseEvent, columnId: string, startWidth: number) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;

    const onMouseMove = (ev: MouseEvent) => {
      const newWidth = Math.max(60, startWidth + (ev.clientX - startX));
      setColumnWidths((prev) => ({ ...prev, [columnId]: newWidth }));
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  const tableWidth =
    FIXED_CHECKBOX_W +
    FIXED_ID_W +
    visibleColumns.reduce((sum, col) => sum + getWidth(col), 0) +
    FIXED_ACTIONS_W;

  const formatCellValue = (value: unknown, type: string): string => {
    if (value === null || value === undefined) return '-';
    switch (type) {
      case 'boolean':
        return value ? 'Yes' : 'No';
      case 'date':
        try {
          return new Date(String(value)).toLocaleDateString();
        } catch {
          return String(value);
        }
      case 'json':
        return typeof value === 'object' ? JSON.stringify(value) : String(value);
      case 'number':
        return typeof value === 'number' ? value.toLocaleString() : String(value);
      default:
        return String(value);
    }
  };

  const renderCellContent = (value: unknown, type: string) => {
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground text-xs">-</span>;
    }
    switch (type) {
      case 'boolean':
        return value ? (
          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
        ) : (
          <XCircle className="h-4 w-4 text-red-600 shrink-0" />
        );
      case 'json':
        return (
          <span className="font-mono text-xs truncate block w-full">
            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
          </span>
        );
      default:
        return (
          <span className="truncate block w-full text-sm" title={formatCellValue(value, type)}>
            {formatCellValue(value, type)}
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 text-xs shrink-0">Completed</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 text-xs shrink-0">In Progress</Badge>;
      case 'pending':
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300 text-xs shrink-0">Pending</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs shrink-0">{status}</Badge>;
    }
  };

  const allSelected = tasks.length > 0 && tasks.every((task) => selectedIds.has(task.id));

  return (
    <div className="flex-1 overflow-auto">
      <table
        style={{ width: tableWidth, tableLayout: 'fixed', borderCollapse: 'collapse' }}
        className="text-sm"
      >
        {/* colgroup for fixed-width layout */}
        <colgroup>
          <col style={{ width: FIXED_CHECKBOX_W }} />
          <col style={{ width: FIXED_ID_W }} />
          {visibleColumns.map((col) => (
            <col key={col.id} style={{ width: getWidth(col) }} />
          ))}
          <col style={{ width: FIXED_ACTIONS_W }} />
        </colgroup>

        <thead className="sticky top-0 bg-card z-10 border-b border-border">
          <tr>
            {/* Checkbox */}
            <th
              style={{ width: FIXED_CHECKBOX_W }}
              className="px-3 py-2 text-left font-medium text-muted-foreground"
            >
              <Checkbox checked={allSelected} onCheckedChange={onSelectAll} />
            </th>

            {/* ID */}
            <th
              style={{ width: FIXED_ID_W }}
              className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground overflow-hidden"
            >
              <span className="truncate block">ID</span>
            </th>

            {/* Dynamic columns */}
            {visibleColumns.map((column) => {
              const w = getWidth(column);
              return (
                <th
                  key={column.id}
                  style={{ width: w }}
                  className="relative px-0 py-0 text-left font-medium text-muted-foreground overflow-hidden border-r border-border/30"
                >
                  <button
                    className="flex items-center gap-1 w-full h-full px-3 py-2 text-xs font-semibold uppercase tracking-wider hover:bg-accent/30 transition-colors overflow-hidden"
                    onClick={() => onSortChange?.(column.key)}
                  >
                    <span className="truncate">{column.name}</span>
                    <ArrowUpDown
                      className={`h-3 w-3 shrink-0 ${
                        sortColumn === column.key ? 'text-foreground' : 'text-muted-foreground/50'
                      }`}
                    />
                  </button>
                  {/* Resize handle */}
                  <div
                    className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-primary/40 active:bg-primary/70 transition-colors z-20"
                    onMouseDown={(e) => startResize(e, column.id, w)}
                  />
                </th>
              );
            })}

            {/* Actions */}
            <th
              style={{ width: FIXED_ACTIONS_W }}
              className="px-3 py-2 text-left font-medium text-muted-foreground"
            />
          </tr>
        </thead>

        <tbody>
          {tasks.length === 0 ? (
            <tr>
              <td
                colSpan={visibleColumns.length + 3}
                className="text-center text-muted-foreground py-12"
              >
                No tasks found. Import data to get started.
              </td>
            </tr>
          ) : (
            tasks.map((task) => (
              <tr
                key={task.id}
                className="border-b border-border/50 hover:bg-accent/40 cursor-pointer transition-colors"
                onClick={() => navigate(`/projects/${projectId}/label/${task.id}`)}
              >
                {/* Checkbox */}
                <td
                  style={{ width: FIXED_CHECKBOX_W }}
                  className="px-3 py-2 overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    checked={selectedIds.has(task.id)}
                    onCheckedChange={() => onToggleSelect(task.id)}
                  />
                </td>

                {/* ID */}
                <td
                  style={{ width: FIXED_ID_W, overflow: 'hidden' }}
                  className="px-3 py-2 font-mono text-xs text-muted-foreground"
                >
                  <span className="truncate block">{task.id.slice(0, 8)}</span>
                </td>

                {/* Dynamic columns */}
                {visibleColumns.map((column) => {
                  const w = getWidth(column);
                  return (
                    <td
                      key={column.id}
                      style={{ width: w, maxWidth: w, overflow: 'hidden' }}
                      className="px-3 py-2"
                    >
                      {renderCellContent(task.data[column.key], column.type)}
                    </td>
                  );
                })}

                {/* Actions */}
                <td
                  style={{ width: FIXED_ACTIONS_W }}
                  className="px-2 py-2 overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => navigate(`/projects/${projectId}/label/${task.id}`)}
                      >
                        Label Task
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {}}>View Details</DropdownMenuItem>
                      {onDeleteTask ? (
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => onDeleteTask(task.id)}
                        >
                          Delete
                        </DropdownMenuItem>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

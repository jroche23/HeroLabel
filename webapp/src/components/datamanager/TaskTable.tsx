import { useNavigate } from 'react-router-dom';
import { XCircle, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/shared/UserAvatar';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import type { Task, Annotation, User } from '@/types';
import type { ColumnKey, SortField } from './DataToolbar';

interface TaskTableProps {
  tasks: Task[];
  annotations: Annotation[];
  users: User[];
  visibleColumns: Set<ColumnKey>;
  selectedIds: Set<string>;
  onToggleSelect: (taskId: string) => void;
  onSelectAll: () => void;
  projectId: string;
  sortField: SortField;
  onSortChange: (field: SortField) => void;
}

function getAnnotatorsForTask(
  taskId: string,
  annotations: Annotation[],
  usersMap: Map<string, User>,
): User[] {
  const userIds = new Set(
    annotations.filter((a) => a.taskId === taskId).map((a) => a.userId),
  );
  const result: User[] = [];
  userIds.forEach((uid) => {
    const user = usersMap.get(uid);
    if (user) result.push(user);
  });
  return result;
}

function truncateHtml(html: string, maxLen: number = 60): string {
  // Strip HTML tags to show plain text preview
  const stripped = html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  return stripped.length > maxLen ? stripped.slice(0, maxLen) + '...' : stripped;
}

export function TaskTable({
  tasks,
  annotations,
  users,
  visibleColumns,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  projectId,
  sortField,
  onSortChange,
}: TaskTableProps) {
  const navigate = useNavigate();
  const usersMap = new Map(users.map((u) => [u.id, u]));
  const allSelected = tasks.length > 0 && tasks.every((t) => selectedIds.has(t.id));
  const someSelected = tasks.some((t) => selectedIds.has(t.id)) && !allSelected;

  const handleRowClick = (taskId: string) => {
    navigate(`/projects/${projectId}/label/${taskId}`);
  };

  const handleSortClick = (field: SortField) => {
    onSortChange(field);
  };

  const SortableHeader = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
    <button
      onClick={() => handleSortClick(field)}
      className={cn(
        'inline-flex items-center gap-1 bg-transparent border-none cursor-pointer text-muted-foreground text-xs font-medium hover:text-foreground transition-colors',
        sortField === field && 'text-foreground',
      )}
    >
      {children}
      <ArrowUpDown className="h-3 w-3" />
    </button>
  );

  return (
    <div className="flex-1 overflow-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="w-10 px-3">
              <Checkbox
                checked={allSelected ? true : (someSelected ? 'indeterminate' : false)}
                onCheckedChange={onSelectAll}
              />
            </TableHead>
            {visibleColumns.has('id') ? (
              <TableHead className="w-20 px-3">
                <SortableHeader field="id">ID</SortableHeader>
              </TableHead>
            ) : null}
            {visibleColumns.has('completedCount') ? (
              <TableHead className="w-24 px-3">
                <SortableHeader field="completedCount">Completed</SortableHeader>
              </TableHead>
            ) : null}
            {visibleColumns.has('cancelledCount') ? (
              <TableHead className="w-24 px-3 text-xs font-medium">
                Cancelled
              </TableHead>
            ) : null}
            {visibleColumns.has('predictionsCount') ? (
              <TableHead className="w-24 px-3 text-xs font-medium">
                Predictions
              </TableHead>
            ) : null}
            {visibleColumns.has('annotators') ? (
              <TableHead className="w-28 px-3 text-xs font-medium">
                Annotators
              </TableHead>
            ) : null}
            {visibleColumns.has('agreement') ? (
              <TableHead className="w-24 px-3 text-xs font-medium">
                Agreement
              </TableHead>
            ) : null}
            {visibleColumns.has('search_query') ? (
              <TableHead className="w-40 px-3 text-xs font-medium">
                search_query
              </TableHead>
            ) : null}
            {visibleColumns.has('html') ? (
              <TableHead className="px-3 text-xs font-medium">html</TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={1 + visibleColumns.size}
                className="h-32 text-center text-muted-foreground"
              >
                No tasks found.
              </TableCell>
            </TableRow>
          ) : null}
          {tasks.map((task) => {
            const taskAnnotators = getAnnotatorsForTask(task.id, annotations, usersMap);
            const taskAnnotationCount = annotations.filter(
              (a) => a.taskId === task.id && a.status === 'submitted',
            ).length;
            const agreement =
              taskAnnotationCount >= 2
                ? Math.round(Math.random() * 40 + 60)
                : null;

            return (
              <TableRow
                key={task.id}
                data-state={selectedIds.has(task.id) ? 'selected' : undefined}
                className="cursor-pointer"
                onClick={() => handleRowClick(task.id)}
              >
                <TableCell
                  className="px-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    checked={selectedIds.has(task.id)}
                    onCheckedChange={() => onToggleSelect(task.id)}
                  />
                </TableCell>

                {visibleColumns.has('id') ? (
                  <TableCell className="px-3 text-xs font-mono text-muted-foreground">
                    {task.id.split('-').pop()}
                  </TableCell>
                ) : null}

                {visibleColumns.has('completedCount') ? (
                  <TableCell className="px-3">
                    <Badge
                      variant={task.completedCount > 0 ? 'default' : 'secondary'}
                      className={cn(
                        'text-[10px] px-1.5 py-0',
                        task.completedCount > 0
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : '',
                      )}
                    >
                      {task.completedCount}
                    </Badge>
                  </TableCell>
                ) : null}

                {visibleColumns.has('cancelledCount') ? (
                  <TableCell className="px-3 text-sm">
                    <span className="inline-flex items-center gap-1 text-xs">
                      {task.cancelledCount > 0 ? (
                        <>
                          <XCircle className="h-3 w-3 text-destructive" />
                          <span className="text-destructive">
                            {task.cancelledCount}
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </span>
                  </TableCell>
                ) : null}

                {visibleColumns.has('predictionsCount') ? (
                  <TableCell className="px-3 text-xs text-muted-foreground">
                    {task.predictionsCount}
                  </TableCell>
                ) : null}

                {visibleColumns.has('annotators') ? (
                  <TableCell className="px-3">
                    <div className="flex -space-x-1">
                      {taskAnnotators.length > 0
                        ? taskAnnotators.map((u) => (
                            <UserAvatar
                              key={u.id}
                              initials={u.initials}
                              color={u.color}
                              size="sm"
                              className="ring-2 ring-background"
                            />
                          ))
                        : <span className="text-xs text-muted-foreground">--</span>}
                    </div>
                  </TableCell>
                ) : null}

                {visibleColumns.has('agreement') ? (
                  <TableCell className="px-3 text-xs text-muted-foreground">
                    {agreement !== null ? `${agreement}%` : '--'}
                  </TableCell>
                ) : null}

                {visibleColumns.has('search_query') ? (
                  <TableCell className="px-3">
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1 py-0 font-normal text-muted-foreground shrink-0"
                      >
                        str
                      </Badge>
                      <span className="text-xs truncate max-w-[120px]">
                        {task.data.search_query ?? '--'}
                      </span>
                    </div>
                  </TableCell>
                ) : null}

                {visibleColumns.has('html') ? (
                  <TableCell className="px-3">
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1 py-0 font-normal text-muted-foreground shrink-0"
                      >
                        str
                      </Badge>
                      <span className="text-xs truncate max-w-[280px] text-muted-foreground">
                        {task.data.html ? truncateHtml(task.data.html) : '--'}
                      </span>
                    </div>
                  </TableCell>
                ) : null}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

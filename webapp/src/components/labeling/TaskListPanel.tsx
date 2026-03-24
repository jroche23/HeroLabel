import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { UserAvatar } from '@/components/shared/UserAvatar';
import type { Task, Annotation, User } from '@/types';

interface TaskListPanelProps {
  tasks: Task[];
  currentTaskId: string;
  onSelectTask: (taskId: string) => void;
  annotations: Annotation[];
  users: User[];
}

function getAnnotationCountForTask(taskId: string, annotations: Annotation[]): number {
  return annotations.filter((a) => a.taskId === taskId).length;
}

function getAgreementForTask(taskId: string, annotations: Annotation[]): number | null {
  const taskAnnotations = annotations.filter((a) => a.taskId === taskId && a.status === 'submitted');
  if (taskAnnotations.length < 2) return null;
  const choices = taskAnnotations.map((a) => a.result[0]?.value?.choices?.[0] ?? '');
  const mostCommon = choices.sort(
    (a, b) => choices.filter((v) => v === b).length - choices.filter((v) => v === a).length,
  )[0];
  const agreementCount = choices.filter((c) => c === mostCommon).length;
  return Math.round((agreementCount / choices.length) * 100);
}

// Get a preview value from task data - picks first meaningful text field
function getTaskPreview(task: Task): string {
  const data = task.data;

  // Priority fields to check for preview
  const priorityFields = ['search_query', 'query', 'text', 'title', 'name', 'description'];

  for (const field of priorityFields) {
    if (data[field] && typeof data[field] === 'string') {
      return String(data[field]);
    }
  }

  // Fall back to first non-html string field
  for (const [key, value] of Object.entries(data)) {
    if (key !== 'html' && typeof value === 'string' && value.trim()) {
      return value;
    }
  }

  return '-';
}

export function TaskListPanel({
  tasks,
  currentTaskId,
  onSelectTask,
  annotations,
  users,
}: TaskListPanelProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
            Tasks
          </span>
          <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
            {tasks.length}
          </Badge>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <table className="w-full">
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="w-8 px-2 py-1.5 text-left font-medium"> </th>
              <th className="px-2 py-1.5 text-left font-medium">ID</th>
              <th className="px-2 py-1.5 text-center font-medium">Done</th>
              <th className="px-2 py-1.5 text-center font-medium">Agr%</th>
              <th className="px-2 py-1.5 text-left font-medium">Preview</th>
              <th className="w-8 px-2 py-1.5 text-center font-medium">Ann</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const isActive = task.id === currentTaskId;
              const annotationCount = getAnnotationCountForTask(task.id, annotations);
              const agreement = getAgreementForTask(task.id, annotations);
              const annotator = annotations.find((a) => a.taskId === task.id);
              const user = annotator ? users.find((u) => u.id === annotator.userId) : undefined;
              const preview = getTaskPreview(task);

              return (
                <tr
                  key={task.id}
                  onClick={() => onSelectTask(task.id)}
                  className={cn(
                    'cursor-pointer border-b border-border/50 transition-colors hover:bg-accent/50',
                    isActive && 'bg-primary/10 hover:bg-primary/15',
                  )}
                >
                  <td className="px-2 py-1">
                    <Checkbox
                      className="h-3.5 w-3.5"
                      checked={task.completedCount > 0}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td className="px-2 py-1 text-xs font-mono text-muted-foreground">
                    {task.id.length > 10 ? `${task.id.slice(-6)}` : task.id}
                  </td>
                  <td className="px-2 py-1 text-center text-xs">
                    <span
                      className={cn(
                        'inline-block h-2 w-2 rounded-full',
                        task.completedCount > 0 ? 'bg-emerald-500' : 'bg-muted-foreground/30',
                      )}
                    />
                  </td>
                  <td className="px-2 py-1 text-center text-xs text-muted-foreground">
                    {agreement !== null ? `${agreement}%` : '-'}
                  </td>
                  <td className="max-w-[120px] truncate px-2 py-1 text-xs text-foreground">
                    {preview}
                  </td>
                  <td className="px-2 py-1 text-center">
                    {user ? (
                      <UserAvatar initials={user.initials} color={user.color} size="sm" />
                    ) : (
                      <span className="text-xs text-muted-foreground">{annotationCount}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </ScrollArea>
    </div>
  );
}

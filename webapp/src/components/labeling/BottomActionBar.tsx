import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Undo2, Redo2, RotateCcw, Settings, Star, Keyboard } from 'lucide-react';
import type { Task } from '@/types';
import { useProjectTabs, type AnnotationSettings } from '@/contexts/ProjectTabContext';

export type { AnnotationSettings };

interface BottomActionBarProps {
  task: Task;
  onSubmit: () => void;
  onSkip: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
  isStarred: boolean;
  onToggleStar: () => void;
  canSubmit: boolean;
  settings: AnnotationSettings;
  onChangeSettings: (patch: Partial<AnnotationSettings>) => void;
}

function ActionButton({
  tooltip,
  onClick,
  children,
  className,
}: {
  tooltip: string;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClick}
          className={cn('h-8 w-8 p-0', className)}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">
        <span className="text-xs">{tooltip}</span>
      </TooltipContent>
    </Tooltip>
  );
}

function SettingRow({
  label,
  description,
  checked,
  onCheckedChange,
  id,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  id: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="flex flex-col gap-0.5">
        <label htmlFor={id} className="text-sm font-medium text-foreground cursor-pointer">
          {label}
        </label>
        {description && (
          <span className="text-xs text-muted-foreground">{description}</span>
        )}
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}

const SHORTCUTS = [
  { key: '1–4', label: 'Select label by number' },
  { key: 'Enter', label: 'Submit annotation' },
  { key: 'S', label: 'Star / unstar task' },
];

export function BottomActionBar({
  task,
  onSubmit,
  onSkip,
  onUndo,
  onRedo,
  onReset,
  isStarred,
  onToggleStar,
  canSubmit,
  settings,
  onChangeSettings,
}: BottomActionBarProps) {
  const { tabs, activeTabId } = useProjectTabs();
  const activeTab = tabs.find((t) => t.id === activeTabId);

  return (
    <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between border-t border-border bg-card px-4 py-2">
      {/* Left side */}
      <div className="flex items-center gap-1">
        <span className="mr-2 font-mono text-xs text-muted-foreground">
          #{task.id.slice(0, 8)}
        </span>

        <ActionButton tooltip="Undo (Ctrl+Z)" onClick={onUndo}>
          <Undo2 className="h-4 w-4" />
        </ActionButton>

        <ActionButton tooltip="Redo (Ctrl+Shift+Z)" onClick={onRedo}>
          <Redo2 className="h-4 w-4" />
        </ActionButton>

        <ActionButton tooltip="Reset" onClick={onReset}>
          <RotateCcw className="h-4 w-4" />
        </ActionButton>

        {/* Settings popover */}
        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Settings className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="top">
              <span className="text-xs">Settings</span>
            </TooltipContent>
          </Tooltip>
          <PopoverContent side="top" align="start" className="w-80">
            <div className="flex flex-col gap-1">
              <div className="mb-2">
                <h4 className="text-sm font-semibold text-foreground">Annotation Settings</h4>
                <p className="text-xs text-muted-foreground">
                  Settings for tab:{' '}
                  <span className="font-medium text-foreground">{activeTab?.name ?? 'Default'}</span>
                </p>
              </div>

              <div className="divide-y divide-border">
                <SettingRow
                  id="auto-advance"
                  label="Auto-advance"
                  description="Go to the next task automatically after submitting"
                  checked={settings.autoAdvance}
                  onCheckedChange={(v) => onChangeSettings({ autoAdvance: v })}
                />
                <SettingRow
                  id="show-reasoning"
                  label="Show reasoning"
                  description="Display the taxonomy reasoning section"
                  checked={settings.showReasoning}
                  onCheckedChange={(v) => onChangeSettings({ showReasoning: v })}
                />
                <SettingRow
                  id="show-comments"
                  label="Show comments"
                  description="Show the comment field for each task"
                  checked={settings.showComments}
                  onCheckedChange={(v) => onChangeSettings({ showComments: v })}
                />
                <SettingRow
                  id="show-shortcuts"
                  label="Show keyboard shortcuts"
                  description="Display shortcut hints next to label choices"
                  checked={settings.showShortcuts}
                  onCheckedChange={(v) => onChangeSettings({ showShortcuts: v })}
                />
              </div>

              {/* Keyboard shortcuts reference */}
              <div className="mt-3 rounded-md bg-muted px-3 py-2">
                <div className="flex items-center gap-1.5 mb-2">
                  <Keyboard className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Keyboard shortcuts</span>
                </div>
                <div className="flex flex-col gap-1">
                  {SHORTCUTS.map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{label}</span>
                      <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-foreground">
                        {key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <ActionButton
          tooltip={isStarred ? 'Remove ground truth' : 'Mark as ground truth'}
          onClick={onToggleStar}
        >
          <Star
            className={cn(
              'h-4 w-4',
              isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground',
            )}
          />
        </ActionButton>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onSkip} className="text-xs">
          Skip
        </Button>
        <Button
          size="sm"
          onClick={onSubmit}
          disabled={!canSubmit}
          className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs"
        >
          Submit
        </Button>
      </div>
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useProjectTabs } from '@/contexts/ProjectTabContext';
import { useUsers } from '@/store';

export function AnnotatorTabs({ projectId: _projectId }: { projectId: string }) {
  const { tabs, activeTabId, setActiveTab, addTab, renameTab, duplicateTab, closeTab } =
    useProjectTabs();
  const users = useUsers();

  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // When editingTabId is set, wait for the ContextMenu close animation to finish
  // before focusing the input — otherwise the menu's focus-return logic steals focus back.
  useEffect(() => {
    if (!editingTabId) return;
    const timer = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [editingTabId]);

  const annotators = users.filter((u) => u.role === 'annotator' || u.role === 'admin');
  const existingAnnotatorIds = new Set(tabs.map((t) => t.annotatorId).filter(Boolean));
  const availableAnnotators = annotators.filter((u) => !existingAnnotatorIds.has(u.id));

  function startRename(tabId: string, currentName: string) {
    setEditingTabId(tabId);
    setEditingName(currentName);
  }

  function commitRename() {
    if (editingTabId && editingName.trim()) {
      renameTab(editingTabId, editingName.trim());
    }
    setEditingTabId(null);
  }

  function cancelRename() {
    setEditingTabId(null);
  }

  function handleRenameKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
    if (e.key === 'Escape') { e.preventDefault(); cancelRename(); }
  }

  return (
    <div className="flex items-center gap-0 border-b border-border bg-[#f8f9fa] px-4 overflow-x-auto shrink-0">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        const isEditing = editingTabId === tab.id;
        const isDefault = tab.id === 'default';

        return (
          <ContextMenu key={tab.id}>
            <ContextMenuTrigger asChild>
              <button
                onClick={() => !isEditing && setActiveTab(tab.id)}
                onDoubleClick={() => !isDefault && startRename(tab.id, tab.name)}
                className={cn(
                  'relative inline-flex h-9 items-center px-4 text-[13px] transition-colors bg-transparent border-none cursor-pointer whitespace-nowrap select-none',
                  isActive
                    ? 'font-medium text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {isEditing ? (
                  <input
                    ref={inputRef}
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={handleRenameKey}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="Tab name…"
                    className="w-28 bg-transparent border-b border-primary outline-none text-[13px] font-medium text-foreground"
                  />
                ) : (
                  tab.name
                )}
              </button>
            </ContextMenuTrigger>

            <ContextMenuContent className="w-40">
              <ContextMenuItem
                onSelect={() => startRename(tab.id, tab.name)}
                disabled={isDefault}
              >
                Rename
              </ContextMenuItem>
              <ContextMenuItem onSelect={() => duplicateTab(tab.id)}>
                Duplicate
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem
                onSelect={() => closeTab(tab.id)}
                disabled={isDefault}
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                Close
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        );
      })}

      {/* Add tab */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="ml-1 h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel className="text-xs">Add Tab</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-sm" onSelect={() => addTab()}>
            New Tab (all tasks)
          </DropdownMenuItem>
          {availableAnnotators.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs">Annotator Tabs</DropdownMenuLabel>
              {availableAnnotators.map((user) => (
                <DropdownMenuItem
                  key={user.id}
                  className="text-sm"
                  onSelect={() => addTab({ annotatorId: user.id, name: user.name })}
                >
                  {user.name}
                </DropdownMenuItem>
              ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

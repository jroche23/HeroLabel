import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { User } from '@/types';

interface ViewTabsProps {
  users: User[];
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function ViewTabs({ users, activeTab, onTabChange }: ViewTabsProps) {
  const annotators = users.filter((u) => u.role === 'annotator' || u.role === 'admin');

  return (
    <div className="flex items-center gap-0 border-b border-border bg-card px-4">
      {/* Default tab */}
      <button
        onClick={() => onTabChange('default')}
        className={cn(
          'relative inline-flex h-8 items-center px-3 text-[13px] transition-colors bg-transparent border-none cursor-pointer',
          activeTab === 'default'
            ? 'font-medium text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-primary'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        Default
      </button>

      {/* One tab per annotator */}
      {annotators.map((user) => (
        <button
          key={user.id}
          onClick={() => onTabChange(user.id)}
          className={cn(
            'relative inline-flex h-8 items-center px-3 text-[13px] transition-colors bg-transparent border-none cursor-pointer',
            activeTab === user.id
              ? 'font-medium text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-primary'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {user.name}
        </button>
      ))}

      {/* Add tab button */}
      <Button
        variant="ghost"
        size="icon"
        className="ml-1 h-6 w-6 text-muted-foreground hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

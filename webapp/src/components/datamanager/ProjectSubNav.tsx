import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface ProjectSubNavProps {
  projectId: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'members', label: 'Members' },
  { id: 'data-manager', label: 'Data Manager' },
  { id: 'settings', label: 'Settings' },
];

export function ProjectSubNav({ projectId, activeTab, onTabChange }: ProjectSubNavProps) {
  return (
    <div className="flex h-9 items-center gap-0 border-b border-border bg-card px-4">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        const isSettings = tab.id === 'settings';

        const content = (
          <span
            className={cn(
              'relative inline-flex h-9 items-center px-3 text-[13px] transition-colors cursor-pointer',
              isActive
                ? 'font-medium text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </span>
        );

        if (isSettings) {
          return (
            <Link key={tab.id} to={`/projects/${projectId}/settings`}>
              {content}
            </Link>
          );
        }

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className="appearance-none border-none bg-transparent p-0"
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}

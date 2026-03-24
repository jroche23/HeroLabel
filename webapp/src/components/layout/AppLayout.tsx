import { TopNav } from './TopNav';
import { useNavSidebar } from './NavSidebarContext';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  sidebar?: React.ReactNode;
  children: React.ReactNode;
}

export function AppLayout({ sidebar, children }: AppLayoutProps) {
  const { isPinned } = useNavSidebar();
  return (
    <div className={cn('flex h-screen flex-col overflow-hidden transition-[margin-left] duration-200', isPinned && 'ml-[220px]')}>
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        {sidebar ? (
          <aside className="hidden md:flex w-[220px] shrink-0 flex-col border-r border-border bg-card overflow-y-auto">
            {sidebar}
          </aside>
        ) : null}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

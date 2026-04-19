import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  FolderOpen,
  BarChart2,
  Users,
  X,
  Pin,
  PinOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavSidebar } from './NavSidebarContext';
import { Button } from '@/components/ui/button';

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: Home, to: '/' },
  { id: 'projects', label: 'Projects', icon: FolderOpen, to: '/projects' },
  { id: 'analytics', label: 'Analytics', icon: BarChart2, to: '/performance/members' },
  { id: 'organization', label: 'Organization', icon: Users, to: '/organization/members' },
];


export function NavSidebar() {
  const { isOpen, isPinned, close, togglePin } = useNavSidebar();
  const location = useLocation();

  return (
    <>
      {/* Backdrop for non-pinned mode */}
      {isOpen && !isPinned && (
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onClick={close}
        />
      )}

      {/* Sidebar panel */}
      <div
        className={cn(
          'fixed left-0 top-0 h-full w-[220px] z-50 flex flex-col bg-card border-r border-border',
          'transition-transform duration-200 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary">
              <svg width="14" height="14" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 5L9 19h7l-3 8 11-13h-7l3-9z" fill="white"/>
              </svg>
            </div>
            <span className="text-sm font-semibold text-foreground">HeroLabel</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={close}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.to === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.id}
                to={item.to}
                onClick={() => { if (!isPinned) close(); }}
                className={cn(
                  'flex items-center gap-3 mx-2 px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="border-t border-border py-2 px-2">
          <button
            onClick={togglePin}
            className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            {isPinned
              ? <PinOff className="h-4 w-4 shrink-0" />
              : <Pin className="h-4 w-4 shrink-0" />}
            {isPinned ? 'Unpin menu' : 'Pin menu'}
          </button>
        </div>
      </div>
    </>
  );
}

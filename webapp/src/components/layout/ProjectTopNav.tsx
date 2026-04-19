import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { UserMenu } from './UserMenu';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNavSidebar } from './NavSidebarContext';

interface BackendProject {
  id: string;
  title: string;
  workspace: string | null;
}

interface ProjectTopNavProps {
  projectId: string;
}

export function ProjectTopNav({ projectId }: ProjectTopNavProps) {
  const location = useLocation();
  const { toggle } = useNavSidebar();

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.get<BackendProject>(`/api/projects/${projectId}`),
    enabled: !!projectId,
  });

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', path: `/projects/${projectId}/dashboard` },
    { id: 'members', label: 'Members', path: `/projects/${projectId}/members` },
    { id: 'data', label: 'Data Manager', path: `/projects/${projectId}/data` },
    { id: 'settings', label: 'Settings', path: `/projects/${projectId}/settings` },
  ];

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-white px-4">
      {/* Left side: hamburger, logo, breadcrumbs */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggle}>
          <Menu className="h-4 w-4 text-muted-foreground" />
        </Button>

        <Link
          to="/"
          className="flex items-center gap-2 text-sm font-semibold text-foreground hover:opacity-80 transition-opacity"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded bg-primary">
            <svg width="14" height="14" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 5L9 19h7l-3 8 11-13h-7l3-9z" fill="white"/>
            </svg>
          </div>
        </Link>

        <div className="h-5 w-px bg-border" />

        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1 text-sm">
          <Link to="/projects" className="text-muted-foreground hover:text-foreground transition-colors">
            Projects
          </Link>
          <span className="text-muted-foreground">/</span>
          {project?.workspace ? (
            <>
              <Link to="/projects" className="text-muted-foreground hover:text-foreground transition-colors">
                {project.workspace}
              </Link>
              <span className="text-muted-foreground">/</span>
            </>
          ) : null}
          <span className="font-medium text-foreground">{project?.title ?? 'Project'}</span>
        </nav>
      </div>

      {/* Center: tabs */}
      <div className="flex items-center">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path ||
            (tab.id === 'data' && location.pathname.startsWith(`/projects/${projectId}/label`));

          return (
            <NavLink
              key={tab.id}
              to={tab.path}
              className={cn(
                'relative inline-flex h-8 items-center px-3 text-[13px] font-medium transition-colors rounded mx-0.5',
                isActive
                  ? 'bg-primary text-white'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              {tab.label}
            </NavLink>
          );
        })}
      </div>

      {/* Right side: user avatar */}
      <div className="flex items-center">
        <UserMenu />
      </div>
    </header>
  );
}

import { Link, useLocation, useParams } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useProject, useWorkspaces } from '@/store';
import { useNavSidebar } from './NavSidebarContext';
import { UserMenu } from './UserMenu';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';

function TopNavBreadcrumb() {
  const location = useLocation();
  const params = useParams<{ projectId: string }>();
  const project = useProject(params.projectId ?? '');
  const workspaces = useWorkspaces();

  const workspace = project
    ? workspaces.find((w) => w.id === project.workspaceId)
    : undefined;

  const pathname = location.pathname;

  // Determine breadcrumb segments based on current route
  const segments: { label: string; to?: string }[] = [];

  if (pathname === '/') {
    segments.push({ label: 'Home' });
  } else if (pathname === '/projects') {
    segments.push({ label: 'Projects' });
  } else if (pathname === '/organization/members') {
    segments.push({ label: 'Organization', to: '/' });
    segments.push({ label: 'Members' });
  } else if (params.projectId && project) {
    segments.push({ label: 'Projects', to: '/projects' });

    if (workspace) {
      segments.push({ label: workspace.name, to: '/projects' });
    }

    const isSettings = pathname.endsWith('/settings');
    if (isSettings) {
      segments.push({
        label: project.name,
        to: `/projects/${project.id}/data`,
      });
      segments.push({ label: 'Settings' });
    } else {
      segments.push({ label: project.name });
    }
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1;
          return (
            <BreadcrumbItem key={`${segment.label}-${index}`}>
              {index > 0 ? <BreadcrumbSeparator /> : null}
              {isLast ? (
                <BreadcrumbPage>{segment.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link to={segment.to ?? '/'}>{segment.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export function TopNav() {
  const { toggle } = useNavSidebar();

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-card px-4">
      {/* Left side: hamburger + logo + breadcrumbs */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggle}>
          <Menu className="h-4 w-4 text-muted-foreground" />
        </Button>
        <Link
          to="/"
          className="flex items-center gap-2 text-sm font-semibold text-foreground hover:opacity-80 transition-opacity"
        >
          <div className="flex h-5 w-5 items-center justify-center rounded bg-primary">
            <svg width="11" height="11" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 5L9 19h7l-3 8 11-13h-7l3-9z" fill="white"/>
            </svg>
          </div>
          <span>HeroLabel</span>
        </Link>

        <div className="h-5 w-px bg-border" />

        <TopNavBreadcrumb />
      </div>

      {/* Right side: user avatar */}
      <div className="flex items-center">
        <UserMenu />
      </div>
    </header>
  );
}

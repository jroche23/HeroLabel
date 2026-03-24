import { Outlet, useParams, useNavigate, useLocation } from 'react-router-dom';
import { ProjectTopNav } from './ProjectTopNav';
import { AnnotatorTabs } from './AnnotatorTabs';
import { useNavSidebar } from './NavSidebarContext';
import { ProjectTabProvider } from '@/contexts/ProjectTabContext';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import DataManager from '@/pages/DataManager';

export function ProjectLayout() {
  const { projectId } = useParams<{ projectId: string }>();
  const { isPinned } = useNavSidebar();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isLabelRoute = /\/label/.test(pathname);
  const isOtherTabRoute = /\/(dashboard|members|settings)/.test(pathname);

  return (
    <ProjectTabProvider projectId={projectId ?? ''}>
      <div className={cn('flex h-screen flex-col overflow-hidden transition-[margin-left] duration-200', isPinned && 'ml-[220px]')}>
        <ProjectTopNav projectId={projectId ?? ''} />
        <AnnotatorTabs projectId={projectId ?? ''} />
        <main className="relative flex-1 overflow-hidden bg-background">
          {/* DataManager: always rendered for data + label routes (stays mounted) */}
          {!isOtherTabRoute && (
            <div className="h-full">
              <DataManager />
            </div>
          )}

          {/* Other tab routes: dashboard, members, settings */}
          {isOtherTabRoute && (
            <div className="h-full overflow-auto">
              <Outlet />
            </div>
          )}

          {/* Labeling interface: renders as overlay on top of DataManager */}
          {isLabelRoute && (
            <div className="absolute inset-0 z-20 flex flex-col bg-background shadow-2xl">
              <div className="flex shrink-0 items-center justify-between border-b border-border bg-card px-4 py-2">
                <span className="text-sm font-semibold text-foreground">Labeling</span>
                <button
                  onClick={() => navigate(`/projects/${projectId}/data`)}
                  className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  aria-label="Close labeling interface"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <Outlet />
              </div>
            </div>
          )}
        </main>
      </div>
    </ProjectTabProvider>
  );
}

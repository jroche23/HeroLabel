import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FolderOpen } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface BackendProject {
  id: string;
  title: string;
  description: string | null;
  workspace: string | null;
  createdAt: string;
  updatedAt: string;
}

export function RecentProjects() {
  const { data: backendProjects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get<BackendProject[]>('/api/projects'),
  });

  const recentProjects = useMemo(() => {
    return [...backendProjects]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 6);
  }, [backendProjects]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Recent Projects</h2>
        {backendProjects.length > 0 && (
          <Link
            to="/projects"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            View All
          </Link>
        )}
      </div>

      {recentProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <FolderOpen className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">No projects yet</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Create your first project to get started
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {recentProjects.map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}/data`}
              className="group flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-accent/50"
            >
              <div className="h-9 w-1 shrink-0 rounded-full bg-primary" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{project.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {project.workspace ?? 'No Workspace'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

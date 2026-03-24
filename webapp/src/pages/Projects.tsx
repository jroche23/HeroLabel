import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { WorkspaceSidebar } from '@/components/projects/WorkspaceSidebar';
import { ProjectGrid } from '@/components/projects/ProjectGrid';

export default function Projects() {
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);

  return (
    <AppLayout
      sidebar={
        <WorkspaceSidebar
          selectedWorkspace={selectedWorkspace}
          onSelectWorkspace={setSelectedWorkspace}
        />
      }
    >
      <ProjectGrid workspaceId={selectedWorkspace} />
    </AppLayout>
  );
}

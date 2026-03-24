import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DangerZoneSettingsProps {
  projectId: string;
  projectTitle: string;
}

function DangerCard({
  title,
  description,
  buttonLabel,
  onClick,
  disabled,
}: {
  title: string;
  description: string;
  buttonLabel: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{description}</p>
      <Button
        variant="outline"
        className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={onClick}
        disabled={disabled}
      >
        {buttonLabel}
      </Button>
    </div>
  );
}

export function DangerZoneSettings({ projectId, projectTitle }: DangerZoneSettingsProps) {
  const navigate = useNavigate();
  const [cacheResetLabel, setCacheResetLabel] = useState('Reset Cache');
  const [dropTabsLabel, setDropTabsLabel] = useState('Drop All Tabs');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function handleResetCache() {
    setCacheResetLabel('Cache Reset!');
    setTimeout(() => setCacheResetLabel('Reset Cache'), 2000);
  }

  function handleDropTabs() {
    setDropTabsLabel('Tabs Dropped!');
    setTimeout(() => setDropTabsLabel('Drop All Tabs'), 2000);
  }

  async function handleDeleteProject() {
    setDeleting(true);
    try {
      await api.delete(`/api/projects/${projectId}`);
      navigate('/');
    } catch {
      setDeleting(false);
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Danger Zone</h2>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
          Perform these actions at your own risk. Actions you take on this page can't be reverted.
          Make sure your data is backed up.
        </p>
      </div>

      <DangerCard
        title="Reset Cache"
        description="Reset Cache may help in cases like if you are unable to modify the labeling configuration due to validation errors concerning existing labels, but you are confident that the labels don't exist. You can use this action to reset the cache and try again."
        buttonLabel={cacheResetLabel}
        onClick={handleResetCache}
      />

      <DangerCard
        title="Drop All Tabs"
        description="If the Data Manager is not loading, dropping all Data Manager tabs can help."
        buttonLabel={dropTabsLabel}
        onClick={handleDropTabs}
      />

      <DangerCard
        title="Delete Project"
        description="Deleting a project removes all tasks, annotations, and project data from the database."
        buttonLabel={deleting ? 'Deleting…' : 'Delete Project'}
        onClick={() => setConfirmDelete(true)}
        disabled={deleting}
      />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{projectTitle}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the project and all its tasks, annotations, and data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteProject}
              disabled={deleting}
            >
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

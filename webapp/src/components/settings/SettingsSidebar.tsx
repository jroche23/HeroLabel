import { cn } from '@/lib/utils';

const SETTINGS_TABS = [
  { id: 'general', label: 'General' },
  { id: 'labeling-interface', label: 'Labeling Interface' },
  { id: 'annotation', label: 'Annotation' },
  { id: 'review', label: 'Review' },
  { id: 'quality', label: 'Quality' },
  { id: 'members', label: 'Members' },
  { id: 'model', label: 'Model' },
  { id: 'predictions', label: 'Predictions' },
  { id: 'cloud-storage', label: 'Cloud Storage' },
  { id: 'webhooks', label: 'Webhooks' },
  { id: 'danger-zone', label: 'Danger Zone' },
] as const;

export type SettingsTabId = (typeof SETTINGS_TABS)[number]['id'];

interface SettingsSidebarProps {
  activeTab: SettingsTabId;
  onTabChange: (tab: SettingsTabId) => void;
}

export function SettingsSidebar({ activeTab, onTabChange }: SettingsSidebarProps) {
  return (
    <nav className="flex flex-col py-4">
      <h3 className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Settings
      </h3>
      {SETTINGS_TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const isDanger = tab.id === 'danger-zone';

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'relative px-4 py-2 text-left text-sm transition-colors',
              'hover:bg-accent/50',
              isActive && 'border-l-2 border-primary bg-accent/60 font-medium',
              !isActive && 'border-l-2 border-transparent',
              isDanger
                ? 'text-red-500 hover:text-red-600'
                : isActive
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}

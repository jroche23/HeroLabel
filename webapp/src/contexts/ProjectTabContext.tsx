import { createContext, useContext, useState, useCallback, useEffect } from 'react';

// ── Shared types ───────────────────────────────────────────────────────────

export interface AnnotationSettings {
  autoAdvance: boolean;
  showComments: boolean;
  showReasoning: boolean;
  showShortcuts: boolean;
}

const DEFAULT_SETTINGS: AnnotationSettings = {
  autoAdvance: true,
  showComments: true,
  showReasoning: true,
  showShortcuts: true,
};

export interface ProjectTab {
  id: string;
  name: string;
  /** User ID from the store/backend. null = "Default" (all tasks visible) */
  annotatorId: string | null;
}

// ── Context value ──────────────────────────────────────────────────────────

interface ProjectTabContextValue {
  tabs: ProjectTab[];
  activeTabId: string;
  /** The annotator user ID currently being filtered, or null for "all tasks" */
  activeAnnotatorId: string | null;
  setActiveTab: (id: string) => void;
  addTab: (opts?: { annotatorId?: string; name?: string }) => void;
  renameTab: (id: string, name: string) => void;
  duplicateTab: (id: string) => void;
  closeTab: (id: string) => void;
  /** Get the annotation settings for a specific tab (falls back to defaults) */
  getTabSettings: (tabId: string) => AnnotationSettings;
  /** Patch the annotation settings for a specific tab */
  updateTabSettings: (tabId: string, patch: Partial<AnnotationSettings>) => void;
}

const DEFAULT_TAB: ProjectTab = { id: 'default', name: 'Default', annotatorId: null };

const ProjectTabContext = createContext<ProjectTabContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────────────────

export function ProjectTabProvider({
  projectId,
  children,
}: {
  projectId: string;
  children: React.ReactNode;
}) {
  const tabsKey = `project-tabs-${projectId}`;
  const activeKey = `project-tabs-${projectId}-active`;
  const settingsKey = `project-tab-settings-${projectId}`;

  const [tabs, setTabs] = useState<ProjectTab[]>(() => {
    try {
      const saved = localStorage.getItem(tabsKey);
      if (saved) {
        const parsed = JSON.parse(saved) as ProjectTab[];
        if (!parsed.find((t) => t.id === 'default')) {
          return [DEFAULT_TAB, ...parsed];
        }
        return parsed;
      }
    } catch {}
    return [DEFAULT_TAB];
  });

  const [activeTabId, setActiveTabId] = useState<string>(() => {
    try {
      return localStorage.getItem(activeKey) ?? 'default';
    } catch {
      return 'default';
    }
  });

  /** Per-tab annotation settings — keyed by tab ID */
  const [tabSettings, setTabSettings] = useState<Record<string, AnnotationSettings>>(() => {
    try {
      const saved = localStorage.getItem(settingsKey);
      if (saved) return JSON.parse(saved) as Record<string, AnnotationSettings>;
    } catch {}
    return {};
  });

  // ── Persistence ──────────────────────────────────────────────────────────

  useEffect(() => {
    try { localStorage.setItem(tabsKey, JSON.stringify(tabs)); } catch {}
  }, [tabs, tabsKey]);

  useEffect(() => {
    try { localStorage.setItem(activeKey, activeTabId); } catch {}
  }, [activeTabId, activeKey]);

  useEffect(() => {
    try { localStorage.setItem(settingsKey, JSON.stringify(tabSettings)); } catch {}
  }, [tabSettings, settingsKey]);

  // ── Derived ───────────────────────────────────────────────────────────────

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];
  const activeAnnotatorId = activeTab?.annotatorId ?? null;

  // ── Tab operations ────────────────────────────────────────────────────────

  const setActiveTab = useCallback((id: string) => {
    setActiveTabId(id);
  }, []);

  const addTab = useCallback((opts?: { annotatorId?: string; name?: string }) => {
    const id = crypto.randomUUID();
    const newTab: ProjectTab = {
      id,
      name: opts?.name ?? 'New Tab',
      annotatorId: opts?.annotatorId ?? null,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(id);
    // New tabs start with default settings
  }, []);

  const renameTab = useCallback((id: string, name: string) => {
    if (id === 'default') return;
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, name } : t)));
  }, []);

  const duplicateTab = useCallback((id: string) => {
    setTabs((prev) => {
      const source = prev.find((t) => t.id === id);
      if (!source) return prev;
      const newId = crypto.randomUUID();
      const copy: ProjectTab = { ...source, id: newId, name: `${source.name} (copy)` };
      const idx = prev.indexOf(source);
      const next = [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)];
      setActiveTabId(newId);
      // Copy the source tab's settings to the duplicate
      setTabSettings((prevSettings) => ({
        ...prevSettings,
        [newId]: { ...(prevSettings[id] ?? DEFAULT_SETTINGS) },
      }));
      return next;
    });
  }, []);

  const closeTab = useCallback(
    (id: string) => {
      if (id === 'default') return;
      setTabs((prev) => {
        const remaining = prev.filter((t) => t.id !== id);
        if (activeTabId === id) {
          const closedIdx = prev.findIndex((t) => t.id === id);
          const fallback = remaining[Math.max(0, closedIdx - 1)] ?? remaining[0];
          setActiveTabId(fallback?.id ?? 'default');
        }
        return remaining;
      });
      // Clean up stored settings for the closed tab
      setTabSettings((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    },
    [activeTabId],
  );

  // ── Settings operations ───────────────────────────────────────────────────

  const getTabSettings = useCallback(
    (tabId: string): AnnotationSettings => {
      return tabSettings[tabId] ?? DEFAULT_SETTINGS;
    },
    [tabSettings],
  );

  const updateTabSettings = useCallback(
    (tabId: string, patch: Partial<AnnotationSettings>) => {
      setTabSettings((prev) => ({
        ...prev,
        [tabId]: { ...(prev[tabId] ?? DEFAULT_SETTINGS), ...patch },
      }));
    },
    [],
  );

  return (
    <ProjectTabContext.Provider
      value={{
        tabs,
        activeTabId,
        activeAnnotatorId,
        setActiveTab,
        addTab,
        renameTab,
        duplicateTab,
        closeTab,
        getTabSettings,
        updateTabSettings,
      }}
    >
      {children}
    </ProjectTabContext.Provider>
  );
}

export function useProjectTabs(): ProjectTabContextValue {
  const ctx = useContext(ProjectTabContext);
  if (!ctx) throw new Error('useProjectTabs must be used within ProjectTabProvider');
  return ctx;
}

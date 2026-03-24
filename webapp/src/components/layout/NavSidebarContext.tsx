import { createContext, useContext, useState, useEffect } from 'react';

interface NavSidebarContextValue {
  isOpen: boolean;
  isPinned: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
  togglePin: () => void;
}

const NavSidebarContext = createContext<NavSidebarContextValue | null>(null);

export function NavSidebarProvider({ children }: { children: React.ReactNode }) {
  const [isPinned, setIsPinned] = useState(() => {
    try {
      return localStorage.getItem('nav-sidebar-pinned') === 'true';
    } catch {
      return false;
    }
  });
  const [isOpen, setIsOpen] = useState(isPinned);

  useEffect(() => {
    if (isPinned) setIsOpen(true);
  }, []);

  function toggle() {
    setIsOpen((v) => !v);
  }

  function open() {
    setIsOpen(true);
  }

  function close() {
    if (!isPinned) setIsOpen(false);
  }

  function togglePin() {
    setIsPinned((v) => {
      const next = !v;
      try {
        localStorage.setItem('nav-sidebar-pinned', String(next));
      } catch {}
      if (!next) setIsOpen(false);
      return next;
    });
  }

  return (
    <NavSidebarContext.Provider value={{ isOpen, isPinned, toggle, open, close, togglePin }}>
      {children}
    </NavSidebarContext.Provider>
  );
}

export function useNavSidebar() {
  const ctx = useContext(NavSidebarContext);
  if (!ctx) throw new Error('useNavSidebar must be used within NavSidebarProvider');
  return ctx;
}

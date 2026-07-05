import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

function getBaseTab(pathname) {
  if (pathname.startsWith('/SavedChats')) return '/SavedChats';
  if (pathname.startsWith('/Projects')) return '/Projects';
  if (pathname.startsWith('/UserProfile')) return '/UserProfile';
  return '/';
}

export function useTabStacks() {
  const location = useLocation();

  const [tabStacks, setTabStacks] = useState(() => {
    const saved = sessionStorage.getItem('mobile-tab-stacks');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        sessionStorage.removeItem('mobile-tab-stacks');
      }
    }

    return {
      '/': ['/'],
      '/SavedChats': ['/SavedChats'],
      '/Projects': ['/Projects'],
      '/UserProfile': ['/UserProfile'],
    };
  });

  useEffect(() => {
    sessionStorage.setItem('mobile-tab-stacks', JSON.stringify(tabStacks));
  }, [tabStacks]);

  useEffect(() => {
    const currentPath = location.pathname + location.search;
    const currentTab = getBaseTab(location.pathname);

    setTabStacks((prev) => {
      const currentStack = [...(prev[currentTab] || [currentTab])];

      if (currentStack[currentStack.length - 1] === currentPath) {
        return prev;
      }

      const next = {
        ...prev,
        [currentTab]: [...currentStack, currentPath],
      };

      sessionStorage.setItem('mobile-tab-stacks', JSON.stringify(next));
      return next;
    });
  }, [location.pathname, location.search]);

  return tabStacks;
}
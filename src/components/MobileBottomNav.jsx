import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, MessageSquare, Folder, User } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Home', icon: Home, path: '/' },
  { label: 'Assistant', icon: MessageSquare, path: '/SavedChats' },
  { label: 'Projects', icon: Folder, path: '/Projects' },
  { label: 'Profile', icon: User, path: '/UserProfile' },
];

function isPathWithinTab(savedPath, tabPath) {
  if (!savedPath || !tabPath) return false;

  if (tabPath === '/' || tabPath === createPageUrl('Dashboard')) {
    return savedPath === '/' || savedPath === createPageUrl('Dashboard');
  }

  return (
    savedPath === tabPath ||
    savedPath.startsWith(`${tabPath}/`) ||
    savedPath.startsWith(`${tabPath}?`)
  );
}

export default function MobileBottomNav() {
  const location = useLocation();
  
  const [tabHistory, setTabHistory] = React.useState(() => {
    const saved = sessionStorage.getItem('mobile-tab-history');
    if (!saved) return {};

    try {
      return JSON.parse(saved);
    } catch {
      sessionStorage.removeItem('mobile-tab-history');
      return {};
    }
  });

  React.useEffect(() => {
    const activeTab = navItems.find((item) =>
      item.path === '/'
        ? location.pathname === '/'
        : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
    );

    if (activeTab) {
      const currentPath = location.pathname + location.search;

      setTabHistory((prev) => {
        if (prev[activeTab.path] === currentPath) return prev;

        const next = {
          ...prev,
          [activeTab.path]: currentPath,
        };

        sessionStorage.setItem('mobile-tab-history', JSON.stringify(next));
        return next;
      });
    }
  }, [location.pathname, location.search]);

  return (
    <nav aria-label="Primary mobile navigation" className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border pb-[env(safe-area-inset-bottom)] z-50">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive =
            item.path === '/'
              ? location.pathname === '/'
              : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
          const savedPath = tabHistory[item.path];
          const targetPath =
            !isActive && isPathWithinTab(savedPath, item.path)
              ? savedPath
              : item.path;
          return (
            <Link
            key={item.label}
            to={targetPath}
            replace={true}
            onClick={(e) => {
                if (isActive) {
                  e.preventDefault();
                  const main = document.querySelector('main');
                  if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, MessageSquare, Folder, User } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';

export default function MobileBottomNav() {
  const location = useLocation();
  
  const [tabHistory, setTabHistory] = React.useState(() => {
    const saved = sessionStorage.getItem('mobile-tab-history');
    return saved ? JSON.parse(saved) : {};
  });

  React.useEffect(() => {
    const activeTab = navItems.find(item => location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path)));
    if (activeTab) {
      const newHistory = { ...tabHistory, [activeTab.path]: location.pathname + location.search };
      setTabHistory(newHistory);
      sessionStorage.setItem('mobile-tab-history', JSON.stringify(newHistory));
    }
  }, [location.pathname, location.search]);

  const navItems = [
    { label: 'Home', icon: Home, path: '/' },
    { label: 'Assistant', icon: MessageSquare, path: '/SavedChats' },
    { label: 'Projects', icon: Folder, path: '/Projects' },
    { label: 'Profile', icon: User, path: '/UserProfile' },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border pb-[env(safe-area-inset-bottom)] z-50">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          const targetPath = (!isActive && tabHistory[item.path]) ? tabHistory[item.path] : item.path;
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
              className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1 text-xs transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
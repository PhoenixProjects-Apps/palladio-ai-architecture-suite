import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, MessageSquare, Folder, User } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';

export default function MobileBottomNav() {
  const location = useLocation();
  
  const navItems = [
    { label: 'Home', icon: Home, path: '/' },
    { label: 'Assistant', icon: MessageSquare, path: '/SavedChats' },
    { label: 'Projects', icon: Folder, path: '/Projects' },
    { label: 'Profile', icon: User, path: '/UserProfile' },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0a0c10]/95 backdrop-blur-md border-t border-white/5 pb-[env(safe-area-inset-bottom)] z-50">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.label}
              to={item.path}
              replace={true}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1 text-xs transition-colors",
                isActive ? "text-amber-500" : "text-slate-500 hover:text-slate-300"
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
import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from 'next-themes';
import Sidebar from '@/components/Sidebar';
import UserHeader from '@/components/UserHeader';
import { Toaster } from 'sonner';
import MobileBottomNav from '@/components/MobileBottomNav';
import { useMobileBack } from '@/hooks/useMobileBack';
import { useTabStacks } from '@/hooks/useTabStacks';

export default function Layout({ children }) {
  const { theme } = useTheme();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  
  useTabStacks(); // Global tab stack manager

  // Prevent back navigation when sidebar is open, closing it instead
  useMobileBack(isMobileOpen, () => setIsMobileOpen(false));
  const mainRef = useRef(null);

  useEffect(() => {
    if (mainRef.current) {
      const savedScroll = sessionStorage.getItem(`scroll-${location.pathname}${location.search}`);
      if (savedScroll) {
        mainRef.current.scrollTop = parseInt(savedScroll, 10);
      } else {
        mainRef.current.scrollTop = 0;
      }
    }
  }, [location.pathname, location.search]);

  const handleScroll = (e) => {
    sessionStorage.setItem(`scroll-${location.pathname}${location.search}`, e.target.scrollTop.toString());
  };

  return (
    <div className="text-foreground bg-background font-sans flex h-screen overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <style>{`
        body { margin: 0; overscroll-behavior-y: none; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: hsl(var(--muted-foreground)); border-radius: 4px; }
      `}</style>
      <Sidebar isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />
      <main ref={mainRef} onScroll={handleScroll} className="flex-1 overflow-y-auto overflow-x-hidden h-full relative pb-[calc(env(safe-area-inset-bottom)+80px)] md:pb-0">
        <div className="sticky top-0 z-50 flex items-center p-4 bg-background/95 backdrop-blur border-b border-border">
          <UserHeader setIsMobileOpen={setIsMobileOpen} />
        </div>
        {children}
        {/* Mobile spacing to ensure content isn't hidden behind the fixed bottom nav */}
        
      </main>
      <MobileBottomNav />
      <Toaster theme={theme === 'dark' ? 'dark' : 'light'} position="bottom-right" />
    </div>
  );
}
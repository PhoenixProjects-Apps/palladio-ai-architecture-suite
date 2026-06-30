import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import UserHeader from '@/components/UserHeader';
import { Toaster } from 'sonner';
import MobileBottomNav from '@/components/MobileBottomNav';

export default function Layout({ children }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
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
    <div className="text-white font-sans flex h-screen overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]" style={{ backgroundColor: '#0f1117' }}>
      <style>{`
        body { background-color: #0f1117 !important; margin: 0; overscroll-behavior-y: none; }
        * { border-color: rgba(255,255,255,0.1); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #374151; border-radius: 4px; }
        .prose-invert h1, .prose-invert h2, .prose-invert h3 { color: #f9fafb; margin-top: 1.5em; margin-bottom: 0.5em; font-weight: 600; }
        .prose-invert h1 { font-size: 1.5rem; }
        .prose-invert h2 { font-size: 1.25rem; }
        .prose-invert h3 { font-size: 1.125rem; }
        .prose-invert p, .prose-invert li { color: #d1d5db; line-height: 1.6; }
        .prose-invert ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1rem; }
        .prose-invert ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 1rem; }
        .prose-invert strong { color: #f9fafb; font-weight: 600; }
        .prose-invert code { color: #22d3ee; background: rgba(34,211,238,0.1); padding: 0.125rem 0.375rem; border-radius: 0.25rem; font-size: 0.875em; }
        .prose-invert pre { background: #1e293b; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; margin-bottom: 1rem; }
        .prose-invert pre code { background: transparent; padding: 0; color: inherit; }
        .prose-invert blockquote { border-left: 4px solid #374151; padding-left: 1rem; color: #9ca3af; font-style: italic; margin: 1rem 0; }
      `}</style>
      <Sidebar isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />
      <main ref={mainRef} onScroll={handleScroll} className="flex-1 overflow-y-auto overflow-x-hidden h-full relative md:pb-0">
        <div className="sticky top-0 z-50 flex items-center p-4 bg-[#0f1117] border-b border-white/5">
          <UserHeader setIsMobileOpen={setIsMobileOpen} />
        </div>
        {children}
        {/* Mobile spacing to ensure content isn't hidden behind the fixed bottom nav */}
        <div className="h-24 md:hidden pb-[env(safe-area-inset-bottom)]"></div>
      </main>
      <MobileBottomNav />
      <Toaster theme="dark" position="bottom-right" />
    </div>
  );
}
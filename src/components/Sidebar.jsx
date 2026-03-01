import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, MessageSquare, Settings, Menu, X, Layers, Building2, MapPin, ClipboardList, FileImage, PanelLeftClose, PanelLeftOpen, ShieldAlert, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [user, setUser] = useState(null);
  const location = useLocation();

  useEffect(() => {
    base44.auth.me().then(u => {
      if (u) setUser(u);
    });
  }, []);

  const isActive = (path) => {
    try {
      return location.pathname.includes(createPageUrl(path).replace('/', ''));
    } catch {
      return false;
    }
  };

  const menuGroups = [
    {
      title: "Overview",
      items: [
        { name: 'Dashboard', icon: Home, path: 'Home' },
        { name: 'AI Assistant', icon: MessageSquare, path: 'SavedChats' },
      ]
    },
    {
      title: "Tools",
      items: [
        { name: 'Assess Plans', icon: FileImage, path: 'PalladioAssess' },
        { name: 'Floorplans', icon: Layers, path: 'PalladioFloorplan' },
        { name: '3D Renders', icon: Building2, path: 'Render3D' },
        { name: 'Property Intel', icon: MapPin, path: 'PalladioProperty' },
        { name: 'Town Planner', icon: ClipboardList, path: 'PalladioPlanner' },
      ]
    }
  ];

  const bottomItems = [
    { name: 'Pricing', icon: CreditCard, path: 'PalladioPricing' },
    { name: 'Settings', icon: Settings, path: 'UserProfile' },
  ];

  if (user?.role === 'admin') {
    bottomItems.unshift({ name: 'Admin', icon: ShieldAlert, path: 'Admin' });
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#0a0c10] border-r border-white/5 text-slate-300">
      <div className="p-4 flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69997bf8be3f3bf35cbd8147/e93fde36f_Lumii_20260222_021318181.png" alt="Logo" className="w-8 h-8 rounded-lg object-cover" />
            <span className="font-bold text-white tracking-tight">Palladio AI</span>
          </div>
        )}
        {isCollapsed && (
          <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69997bf8be3f3bf35cbd8147/e93fde36f_Lumii_20260222_021318181.png" alt="Logo" className="w-8 h-8 rounded-lg object-cover mx-auto" />
        )}
        <button onClick={() => setIsCollapsed(!isCollapsed)} className="hidden md:flex p-1.5 hover:bg-white/10 rounded-md text-slate-400">
          {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
        <button onClick={() => setIsMobileOpen(false)} className="md:hidden p-1.5 hover:bg-white/10 rounded-md text-slate-400">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-6" style={{ scrollbarWidth: 'none' }}>
        {menuGroups.map((group, idx) => (
          <div key={idx} className="px-3">
            {!isCollapsed && <div className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">{group.title}</div>}
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = isActive(item.path);
                return (
                  <Link key={item.path} to={createPageUrl(item.path)} onClick={() => setIsMobileOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${active ? 'bg-amber-500/10 text-amber-400' : 'hover:bg-white/5 text-slate-400 hover:text-white'} ${isCollapsed ? 'justify-center' : ''}`} title={isCollapsed ? item.name : ''}>
                    <item.icon size={20} className={active ? 'text-amber-500' : ''} />
                    {!isCollapsed && <span className="font-medium text-sm">{item.name}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-white/5 space-y-1">
        {bottomItems.map((item) => {
          const active = isActive(item.path);
          return (
            <Link key={item.path} to={createPageUrl(item.path)} onClick={() => setIsMobileOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${active ? 'bg-amber-500/10 text-amber-400' : 'hover:bg-white/5 text-slate-400 hover:text-white'} ${isCollapsed ? 'justify-center' : ''}`} title={isCollapsed ? item.name : ''}>
              <item.icon size={20} className={active ? 'text-amber-500' : ''} />
              {!isCollapsed && <span className="font-medium text-sm">{item.name}</span>}
            </Link>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Button variant="outline" size="icon" onClick={() => setIsMobileOpen(true)} className="bg-[#0a0c10] border-white/10 text-white rounded-xl">
          <Menu size={20} />
        </Button>
      </div>

      <div className={`hidden md:block transition-all duration-300 h-screen sticky top-0 flex-shrink-0 ${isCollapsed ? 'w-[72px]' : 'w-64'}`}>
        <SidebarContent />
      </div>

      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMobileOpen(false)} className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm" />
            <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', bounce: 0, duration: 0.3 }} className="fixed inset-y-0 left-0 w-64 z-50 md:hidden shadow-2xl shadow-black">
              <SidebarContent />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
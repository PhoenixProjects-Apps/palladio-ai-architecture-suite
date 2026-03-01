import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { MessageSquare, Image as ImageIcon, FileText, Building2, User } from 'lucide-react';

const navItems = [
  { icon: MessageSquare, label: 'Chat', page: 'Home' },
  { icon: ImageIcon, label: 'Media', page: 'Home' },
  { icon: FileText, label: 'Docs', page: 'Home' },
  { icon: Building2, label: 'Palladio', page: 'Home' },
  { icon: User, label: 'Profile', page: 'Home' },
];

export default function Layout({ children, currentPageName }) {
  return (
    <div className="text-white" style={{ backgroundColor: '#0a0a14', minHeight: '100vh' }}>
      <style>{`
        body { background-color: #0a0a14 !important; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #111; }
        ::-webkit-scrollbar-thumb { background: #374151; border-radius: 4px; }
      `}</style>
      <div style={{ maxWidth: '520px', margin: '0 auto', minHeight: '100vh', position: 'relative' }}>
        <main style={{ paddingBottom: '72px' }}>
          {children}
        </main>
        <nav style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          backgroundColor: '#111827', borderTop: '1px solid #1f2937', zIndex: 50
        }}>
          <div style={{ maxWidth: '520px', margin: '0 auto', display: 'flex', justifyContent: 'space-around', padding: '10px 0 8px' }}>
            {navItems.map(({ icon: Icon, label, page }) => {
              const isActive = label === 'Palladio';
              return (
                <Link
                  key={label}
                  to={createPageUrl(page)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                    color: isActive ? '#14b8a6' : '#6b7280', textDecoration: 'none', padding: '0 12px'
                  }}
                >
                  <Icon size={22} />
                  <span style={{ fontSize: '10px' }}>{label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
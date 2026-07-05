import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { User, Coins, Menu } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

export default function UserHeader({ setIsMobileOpen }) {
  const { user, credits } = useAuth();

  return (
    <div className="flex items-center justify-between gap-3 w-full">
      <div className="flex items-center gap-3">
        <Button aria-label="Open Menu" variant="outline" size="icon" className="md:hidden bg-background border-border text-foreground" onClick={() => setIsMobileOpen(true)}>
          <Menu size={20} />
        </Button>
        <img src="https://www.image2url.com/r2/default/images/1782439345351-85257dc4-fda3-43f5-9ae4-2f91ee65350a.png" alt="Palladio AI" className="h-10" />
      </div>
      <div className="flex items-center gap-3">
        <Link to={createPageUrl('PalladioPricing')} className="flex items-center gap-2 text-sm font-semibold text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 px-4 py-2 rounded-full transition border border-amber-500/20">
          <Coins size={16} />
          {user ? (credits ?? 0) : '—'}
        </Link>
        {user ? (
          <Link to={createPageUrl('UserProfile')} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-foreground font-bold hover:opacity-80 transition shadow-lg border border-border overflow-hidden">
            {user.profile_picture ? (
              <img src={user.profile_picture} alt={user.full_name || 'Profile'} className="w-10 h-10 object-cover" />
            ) : (
              user.full_name?.charAt(0) || <User size={18} />
            )}
          </Link>
        ) : (
          <button onClick={() => base44.auth.redirectToLogin()} className="text-sm font-semibold text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted px-4 py-2 rounded-full transition">
            Sign In
          </button>
        )}
      </div>
    </div>
  );
}
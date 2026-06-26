import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { User, Coins, Menu } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function UserHeader() {
  const [user, setUser] = useState(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => {
      if (u) setUser(u);
    });
    const unsubscribe = base44.entities.User.subscribe((event) => {
      if (event.type === 'update') {
        base44.auth.me().then(u => { if (u) setUser(u); });
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="md:hidden flex items-center gap-3">
    <Button variant="outline" size="icon" onClick={() => setIsMobileOpen(true)} className=" flex items-left justify-left bg-[#0a0c10] border-white/10 text-white rounded-xl">
          <Menu size={20} />
        </Button>
      <img src="https://www.image2url.com/r2/default/images/1782439345351-85257dc4-fda3-43f5-9ae4-2f91ee65350a.png" alt="Palladio AI" className="h-10 flex items-left justify-left bg-[#0a0c10] border-white/10 text-white rounded-xl" />
      <Link to={createPageUrl('PalladioPricing')} className="flex items-center gap-2 text-sm font-semibold text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 px-4 py-2 rounded-full transition border border-amber-500/20">
        <Coins size={16} />
        {user ? (user.tokens ?? 0) : '—'}
      </Link>
      {user ? (
        <Link to={createPageUrl('UserProfile')} className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-white font-bold hover:opacity-80 transition shadow-lg border border-white/10 overflow-hidden">
          {user.profile_picture ? (
            <img src={user.profile_picture} alt={user.full_name || 'Profile'} className="w-full h-full object-cover" />
          ) : (
            user.full_name?.charAt(0) || <User size={18} />
          )}
        </Link>
      ) : (
        <button onClick={() => base44.auth.redirectToLogin()} className="text-sm font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full transition">
          Sign In
        </button>
      )}
    </div>
  );
}
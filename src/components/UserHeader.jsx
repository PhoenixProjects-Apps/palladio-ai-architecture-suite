import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { User, Coins } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function UserHeader() {
  const [user, setUser] = useState(null);

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
    <div className="flex items-center gap-3">
      <img src="https://www.image2url.com/r2/default/images/1782438537861-5e264cf6-6fe6-4db6-8dfb-ce9318170b53.png" alt="Palladio AI" className="h-full object-cover" />
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
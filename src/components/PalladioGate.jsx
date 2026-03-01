import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PalladioGate({ children }) {
    const [hasAccess, setHasAccess] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAccess = async () => {
            try {
                const user = await base44.auth.me();
                if (!user) {
                    setHasAccess(false);
                    return;
                }
                const subs = await base44.entities.Subscription.filter({ user_email: user.email, status: 'active' });
                setHasAccess(subs.length > 0);
            } catch (e) {
                setHasAccess(false);
            } finally {
                setLoading(false);
            }
        };
        checkAccess();
    }, []);

    if (loading) return <div className="fixed inset-0 flex items-center justify-center bg-[#0f1117]"><Loader2 className="animate-spin text-cyan-500" size={32} /></div>;

    if (!hasAccess) {
        return (
            <div className="fixed inset-0 bg-[#0f1117] flex flex-col items-center justify-center p-6 text-center z-50">
                <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mb-6">
                    <Lock size={32} className="text-slate-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Subscription Required</h2>
                <p className="text-slate-400 max-w-md mb-8">Unlock the full power of Palladio AI architecture suite. Assess plans, generate floorplans, render in 3D, and get property intelligence.</p>
                <Link to={createPageUrl('PalladioPricing')}>
                    <Button className="bg-white text-black hover:bg-slate-200 px-8 py-6 rounded-xl font-semibold text-lg">
                        View Pricing
                    </Button>
                </Link>
                <Link to={createPageUrl('Home')} className="mt-6 text-sm text-slate-500 hover:text-white transition-colors">
                    Return to Home
                </Link>
            </div>
        );
    }

    return children;
}
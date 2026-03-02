import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, CreditCard, Calendar, Settings, ExternalLink, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function SubscriptionManagement() {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [inIframe, setInIframe] = useState(false);

  useEffect(() => {
    try {
        setInIframe(window.self !== window.top);
    } catch (e) {
        setInIframe(true);
    }

    const fetchSub = async () => {
      try {
        const u = await base44.auth.me();
        if (!u) {
          base44.auth.redirectToLogin();
          return;
        }
        
        const subs = await base44.entities.Subscription.filter({ user_email: u.email });
        if (subs && subs.length > 0) {
          const activeSub = subs.find(s => s.status === 'active') || subs[0];
          setSubscription(activeSub);
        }
      } catch (err) {
        console.error("Fetch error", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSub();
  }, []);

  const handleManageStripe = async () => {
    if (inIframe) {
        window.open(window.location.href, '_blank');
        return;
    }

    try {
      setPortalLoading(true);
      const { data } = await base44.functions.invoke('createCustomerPortalSession', {
        returnUrl: window.location.href
      });
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "No URL returned");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to open billing portal");
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1117] text-white p-6 pb-12">
      <div className="max-w-2xl mx-auto">
        <header className="flex items-center gap-4 mb-8 border-b border-white/10 pb-4">
          <Link to={createPageUrl('UserProfile')}>
            <Button variant="ghost" size="icon" className="hover:bg-white/10 rounded-full text-slate-400 hover:text-white">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shadow-lg border border-amber-500/20">
            <Settings size={20} className="text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold">Subscription Management</h1>
        </header>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          
          {!subscription || subscription.status !== 'active' ? (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center">
              <CreditCard className="w-12 h-12 text-slate-500 mx-auto mb-4 opacity-50" />
              <h2 className="text-xl font-semibold mb-2">No Active Subscription</h2>
              <p className="text-slate-400 mb-6">You are currently on the Free Plan. Upgrade to access premium features.</p>
              <Link to={createPageUrl('PalladioPricing')}>
                <Button className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl h-11 px-6">
                  View Pricing Plans
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                  <CreditCard size={120} />
                </div>
                
                <div className="flex items-center gap-3 mb-6">
                  {subscription.cancel_at_period_end ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      <AlertCircle size={14} /> Cancels at period end
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      <CheckCircle2 size={14} /> Active Subscription
                    </span>
                  )}
                </div>

                <div className="space-y-6 relative z-10">
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Current Plan</p>
                    <h3 className="text-2xl sm:text-3xl font-bold text-white">
                      {subscription.plan_type === 'palladio_annual' ? 'Palladio Pro Annual' : 'Palladio Pro Monthly'}
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-900/50 rounded-2xl p-4 border border-white/5">
                      <p className="text-xs text-slate-500 mb-1 flex items-center gap-1.5">
                        <Calendar size={14} /> Current Period Start
                      </p>
                      <p className="font-medium text-slate-200">
                        {subscription.current_period_start ? format(new Date(subscription.current_period_start), 'MMM d, yyyy') : 'N/A'}
                      </p>
                    </div>
                    <div className="bg-slate-900/50 rounded-2xl p-4 border border-white/5">
                      <p className="text-xs text-slate-500 mb-1 flex items-center gap-1.5">
                        <Calendar size={14} /> {subscription.cancel_at_period_end ? 'Access Ends' : 'Next Billing Date'}
                      </p>
                      <p className="font-medium text-white">
                        {subscription.current_period_end ? format(new Date(subscription.current_period_end), 'MMM d, yyyy') : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8">
                <h3 className="text-lg font-semibold mb-2">Manage Billing & Payment</h3>
                <p className="text-slate-400 text-sm mb-6">
                  Update your payment method, view billing history, download invoices, or change your subscription plan securely through Stripe.
                </p>
                <Button 
                  onClick={handleManageStripe} 
                  disabled={portalLoading}
                  className="w-full sm:w-auto bg-white hover:bg-slate-200 text-slate-900 font-semibold rounded-xl h-11 px-6 shadow-lg"
                >
                  {portalLoading ? (
                    <><Loader2 size={18} className="mr-2 animate-spin" /> Loading Portal...</>
                  ) : (
                    <>Manage on Stripe <ExternalLink size={16} className="ml-2" /></>
                  )}
                </Button>
              </div>
            </>
          )}

        </motion.div>
      </div>
    </div>
  );
}
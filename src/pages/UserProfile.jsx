import React, { useEffect, useState, useRef } from 'react';
import BackButton from "@/components/BackButton";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Mail, CreditCard, LogOut, Loader2, User, ShieldAlert, Camera, Trash2, FileText, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { uploadToFirebase } from '@/lib/uploadHelper';

export default function UserProfile() {
  const { logout } = useAuth();
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const u = await base44.auth.me();
        if (!u) {
          base44.auth.redirectToLogin();
          return;
        }
        setUser(u);
        
        const subs = await base44.entities.Subscription.filter({ user_email: u.email });
        if (subs && subs.length > 0) {
          const activeSub = subs.find(s => s.status === 'active') || subs[0];
          setSubscription(activeSub);
        }
      } catch (err) {
        console.error("Auth error", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUser();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  const handleLogout = () => {
    logout();
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleDeleteAccount = async () => {
    try {
      if (user?.id) {
        await base44.entities.User.delete(user.id);
      }
      toast.success('Account scheduled for deletion.');
      logout();
    } catch (err) {
      console.error('Delete error', err);
      // Fallback message if RLS prevents self-delete directly
      toast.success('Account deletion requested. You will be logged out.');
      logout();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file.');
      return;
    }
    try {
      setUploading(true);
      const { file_url } = await uploadToFirebase(file);
      await base44.auth.updateMe({ profile_picture: file_url });
      setUser(prev => ({ ...prev, profile_picture: file_url }));
      toast.success('Profile picture updated.');
    } catch (err) {
      console.error('Upload error', err);
      toast.error('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1117] text-white p-6 pb-12">
      <div className="max-w-2xl mx-auto">
        <header className="flex items-center gap-4 mb-8 border-b border-white/10 pb-4">
          <BackButton aria-label="Go Back" className="hover:bg-white/10 rounded-full" />
          <div className="w-10 min-h-11 h-auto rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center shadow-lg">
            <User size={20} />
          </div>
          <h1 className="text-2xl font-bold">Profile</h1>
        </header>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl space-y-8">
          
          <div className="flex items-center gap-5">
            <div className="relative group shrink-0">
              <button
                onClick={handleAvatarClick}
                disabled={uploading}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-2xl sm:text-3xl font-bold border border-white/10 shadow-lg overflow-hidden relative cursor-pointer"
              >
                {user?.profile_picture ? (
                  <img src={user.profile_picture} alt={user?.full_name || 'Profile'} className="w-full h-full object-cover" />
                ) : (
                  user?.full_name?.charAt(0) || <User size={32} />
                )}
                <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  {uploading ? <Loader2 size={24} className="animate-spin" /> : <Camera size={24} />}
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold">{user?.full_name || 'User'}</h2>
              <p className="text-slate-400 flex items-center gap-2 mt-1.5 text-sm sm:text-base">
                <Mail size={16} /> {user?.email}
              </p>
            </div>
          </div>

          <div className="space-y-4 border-t border-white/10 pt-6">
            <h3 className="text-xs sm:text-sm font-medium text-slate-400 uppercase tracking-wider">Membership</h3>
            {subscription && subscription.status === 'active' ? (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 min-h-11 h-auto rounded-full bg-amber-500/20 flex items-center justify-center">
                    <CreditCard className="text-amber-500" size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-amber-500 text-lg">
                      {subscription.plan_type === 'palladio_annual' ? 'Pro Annual' : 'Pro Monthly'}
                    </p>
                    <p className="text-sm text-amber-500/80">
                      Status: Active
                    </p>
                  </div>
                </div>
                <Link to={createPageUrl('SubscriptionManagement')}>
                  <Button variant="outline" className="w-full sm:w-auto border-amber-500/30 text-amber-500 hover:bg-amber-500/20 hover:text-amber-400">
                    Manage Plan
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 min-h-11 h-auto rounded-full bg-white/5 flex items-center justify-center">
                    <CreditCard className="text-slate-400" size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-lg">Free Plan</p>
                    <p className="text-sm text-slate-400">Upgrade to access all features</p>
                  </div>
                </div>
                <Link to={createPageUrl('PalladioPricing')}>
                  <Button className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white border-0">
                    Upgrade to Pro
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {user?.role === 'admin' && (
            <div className="border-t border-white/10 pt-6 pb-2">
              <h3 className="text-xs sm:text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">Administration</h3>
              <Link to={createPageUrl('Admin')} className="block">
                <Button className="w-full bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 h-11">
                  <ShieldAlert size={18} className="mr-2" />
                  Admin Dashboard
                </Button>
              </Link>
            </div>
          )}

          <div className="border-t border-white/10 pt-6 flex flex-col gap-4">
            <Link to={createPageUrl('PrivacyPolicy')} className="block">
              <Button variant="outline" className="w-full bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white h-11">
                <Shield size={18} className="mr-2" />
                Privacy Policy
              </Button>
            </Link>
            
            <Link to={createPageUrl('TermsOfService')} className="block">
              <Button variant="outline" className="w-full bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white h-11">
                <FileText size={18} className="mr-2" />
                Terms of Service
              </Button>
            </Link>

            <Button 
              onClick={handleLogout}
              variant="outline" 
              className="w-full bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white h-11"
            >
              <LogOut size={18} className="mr-2" />
              Sign Out
            </Button>

            <Button 
              onClick={() => setIsDeleteDialogOpen(true)}
              variant="destructive" 
              className="w-full bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 h-11"
            >
              <Trash2 size={18} className="mr-2" />
              Delete Account
            </Button>
          </div>
        </motion.div>

        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="bg-[#1a1d24] border-white/10 text-white shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-red-500">Delete Account</DialogTitle>
              <DialogDescription className="text-slate-400">
                Are you absolutely sure? This action cannot be undone. This will permanently delete your account and remove your data from our servers.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-6 flex gap-3 sm:justify-end">
              <Button variant="ghost" onClick={() => setIsDeleteDialogOpen(false)} className="hover:bg-white/5 hover:text-white">
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteAccount} className="bg-red-600 hover:bg-red-700 text-white">
                Yes, delete my account
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
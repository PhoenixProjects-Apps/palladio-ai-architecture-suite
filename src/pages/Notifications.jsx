import React, { useState, useEffect } from 'react';
import { Bell, Check, Settings, Trash2, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import PalladioGate from '@/components/PalladioGate';
import { toast } from 'sonner';

export default function Notifications() {
    const [notifications, setNotifications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [preferences, setPreferences] = useState({
        project_updates: true,
        new_messages: true,
        file_uploads: true
    });
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    useEffect(() => {
        loadData();
        const unsubscribe = base44.entities.Notification?.subscribe?.(() => {
            loadData();
        });
        return () => unsubscribe && unsubscribe();
    }, []);

    const loadData = async () => {
        try {
            const currentUser = await base44.auth.me();
            if (!currentUser) return;
            setUser(currentUser);
            
            if (currentUser.notification_preferences) {
                setPreferences({
                    ...preferences,
                    ...currentUser.notification_preferences
                });
            }

            const notifs = await base44.entities.Notification.filter({ user_email: currentUser.email }, '-created_date', 50);
            setNotifications(notifs || []);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const markAsRead = async (id) => {
        try {
            await base44.entities.Notification.update(id, { is_read: true });
            setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch (e) {
            console.error(e);
        }
    };

    const markAllAsRead = async () => {
        try {
            const unread = notifications.filter(n => !n.is_read);
            await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { is_read: true })));
            setNotifications(notifications.map(n => ({ ...n, is_read: true })));
            toast.success("All marked as read");
        } catch (e) {
            console.error(e);
        }
    };

    const clearAll = async () => {
        if (!confirm("Are you sure you want to delete all notifications?")) return;
        try {
            await Promise.all(notifications.map(n => base44.entities.Notification.delete(n.id)));
            setNotifications([]);
            toast.success("All notifications cleared");
        } catch (e) {
            console.error(e);
        }
    };

    const handlePrefChange = async (key, checked) => {
        const newPrefs = { ...preferences, [key]: checked };
        setPreferences(newPrefs);
        try {
            await base44.auth.updateMe({ notification_preferences: newPrefs });
            toast.success("Preferences updated");
        } catch (e) {
            toast.error("Failed to update preferences");
        }
    };

    if (isLoading) return <div className="flex-1 flex items-center justify-center bg-[#0f1117] h-screen"><Loader2 className="animate-spin text-amber-500" size={32} /></div>;

    return (
        <PalladioGate>
            <div className="min-h-screen bg-[#0f1117] text-white p-6 md:p-10">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-between mb-10">
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <Bell className="text-amber-500" size={32} />
                            Notifications
                        </h1>
                        
                        <div className="flex gap-3">
                            {notifications.length > 0 && (
                                <>
                                    <Button variant="outline" onClick={markAllAsRead} className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-white">
                                        <Check size={16} className="mr-2" /> Mark all read
                                    </Button>
                                    <Button variant="outline" onClick={clearAll} className="bg-slate-800 border-slate-700 hover:bg-red-900/50 hover:text-red-400 text-white">
                                        <Trash2 size={16} className="mr-2" /> Clear
                                    </Button>
                                </>
                            )}
                            
                            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                                <DialogTrigger asChild>
                                    <Button className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl">
                                        <Settings size={18} className="mr-2" /> Preferences
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-[#1a1d24] border-white/10 text-white shadow-2xl">
                                    <DialogHeader>
                                        <DialogTitle>Notification Preferences</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-6 mt-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <Label className="text-base font-semibold text-white">Project Updates</Label>
                                                <p className="text-sm text-slate-400">Get notified when your projects are modified.</p>
                                            </div>
                                            <Switch checked={preferences.project_updates} onCheckedChange={(c) => handlePrefChange('project_updates', c)} />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <Label className="text-base font-semibold text-white">New Messages</Label>
                                                <p className="text-sm text-slate-400">Alerts for new replies in AI discussions.</p>
                                            </div>
                                            <Switch checked={preferences.new_messages} onCheckedChange={(c) => handlePrefChange('new_messages', c)} />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <Label className="text-base font-semibold text-white">File Uploads</Label>
                                                <p className="text-sm text-slate-400">Notifications when assets are added.</p>
                                            </div>
                                            <Switch checked={preferences.file_uploads} onCheckedChange={(c) => handlePrefChange('file_uploads', c)} />
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>

                    {notifications.length === 0 ? (
                        <div className="bg-white/5 border border-white/10 rounded-3xl p-16 text-center">
                            <Bell className="w-16 h-16 text-slate-500 mx-auto mb-6 opacity-40" />
                            <h2 className="text-2xl font-semibold text-white mb-3">All caught up!</h2>
                            <p className="text-slate-400 max-w-sm mx-auto">You have no new notifications at the moment.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {notifications.map(notif => (
                                <div key={notif.id} className={`p-4 rounded-xl border ${notif.is_read ? 'bg-white/5 border-white/5' : 'bg-slate-800/80 border-amber-500/30'} flex items-start gap-4 transition-colors`}>
                                    <div className={`mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0 ${notif.is_read ? 'bg-transparent' : 'bg-amber-500'}`} />
                                    <div className="flex-1">
                                        <h3 className={`font-semibold ${notif.is_read ? 'text-slate-300' : 'text-white'}`}>{notif.title}</h3>
                                        <p className="text-slate-400 text-sm mt-1">{notif.message}</p>
                                        <p className="text-slate-500 text-xs mt-2">{new Date(notif.created_date).toLocaleString()}</p>
                                    </div>
                                    {!notif.is_read && (
                                        <Button variant="ghost" size="sm" onClick={() => markAsRead(notif.id)} className="text-slate-400 hover:text-white">
                                            Mark read
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </PalladioGate>
    );
}
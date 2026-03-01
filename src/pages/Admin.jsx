import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Users, BarChart, Settings, ShieldAlert, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function Admin() {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [selectedUser, setSelectedUser] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editPlan, setEditPlan] = useState('');
  const [editStatus, setEditStatus] = useState('');

  const fetchData = async () => {
    try {
      const u = await base44.auth.me();
      setCurrentUser(u);
      
      if (u?.role === 'admin') {
        const [usersRes, subsRes] = await Promise.all([
          base44.entities.User.list(),
          base44.entities.Subscription.list()
        ]);
        setUsers(usersRes);
        setSubscriptions(subsRes);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <div className="min-h-screen bg-[#0f1117] flex items-center justify-center text-white">Loading...</div>;

  if (currentUser?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#0f1117] flex flex-col items-center justify-center text-white">
        <ShieldAlert size={48} className="text-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-slate-400">You do not have permission to view this page.</p>
        <Link to={createPageUrl('Home')} className="mt-6">
          <Button variant="outline" className="border-slate-700 text-slate-300">Return Home</Button>
        </Link>
      </div>
    );
  }

  const activeSubs = subscriptions.filter(s => s.status === 'active');
  const proMonthly = activeSubs.filter(s => s.plan_type === 'palladio_monthly').length;
  const proAnnual = activeSubs.filter(s => s.plan_type === 'palladio_annual').length;

  const handleEditClick = (u) => {
    const sub = subscriptions.find(s => s.user_email === u.email && s.status === 'active') || subscriptions.find(s => s.user_email === u.email);
    setSelectedUser(u);
    setEditPlan(sub ? sub.plan_type : 'none');
    setEditStatus(sub ? sub.status : 'active');
    setIsDialogOpen(true);
  };

  const handleSaveMembership = async () => {
    try {
      const existingSub = subscriptions.find(s => s.user_email === selectedUser.email);
      if (editPlan === 'none') {
        if (existingSub) {
          await base44.entities.Subscription.update(existingSub.id, { status: 'canceled' });
        }
      } else {
        if (existingSub) {
          await base44.entities.Subscription.update(existingSub.id, { plan_type: editPlan, status: editStatus });
        } else {
          await base44.entities.Subscription.create({
            user_email: selectedUser.email,
            stripe_customer_id: 'manual_' + Date.now(),
            plan_type: editPlan,
            status: editStatus,
          });
        }
      }
      await fetchData();
      setIsDialogOpen(false);
    } catch (e) {
      console.error(e);
      alert('Error updating membership');
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1117] text-white p-6 pb-24">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex items-center gap-4 border-b border-white/10 pb-4">
          <Link to={createPageUrl('Home')}>
            <Button variant="ghost" size="icon" className="hover:bg-white/10 rounded-full">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg">
            <Settings size={20} />
          </div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        </header>

        {/* Analytics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-slate-400 text-sm font-medium flex items-center gap-2">
                <Users size={16} /> Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{users.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-slate-400 text-sm font-medium flex items-center gap-2">
                <BarChart size={16} /> Active Subscriptions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-500">{activeSubs.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-slate-400 text-sm font-medium flex items-center gap-2">
                <BarChart size={16} /> Plan Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 text-sm text-slate-300">
                <div>Monthly: <span className="text-white font-medium">{proMonthly}</span></div>
                <div>Annual: <span className="text-white font-medium">{proAnnual}</span></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-white/10 bg-white/[0.02]">
            <h2 className="text-lg font-semibold">User Management</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-slate-400">
                <tr>
                  <th className="px-6 py-4 font-medium">User</th>
                  <th className="px-6 py-4 font-medium">Role</th>
                  <th className="px-6 py-4 font-medium">Membership</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map(u => {
                  const sub = subscriptions.find(s => s.user_email === u.email && s.status === 'active') || subscriptions.find(s => s.user_email === u.email);
                  return (
                    <tr key={u.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">{u.full_name || 'No Name'}</div>
                        <div className="text-slate-500 text-xs">{u.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${u.role === 'admin' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-500/20 text-slate-400'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {sub && sub.status === 'active' ? (
                          <div>
                            <div className="text-amber-400 font-medium">
                              {sub.plan_type === 'palladio_annual' ? 'Pro Annual' : 'Pro Monthly'}
                            </div>
                            <div className="text-xs text-slate-500">{sub.status}</div>
                          </div>
                        ) : (
                          <span className="text-slate-500">Free</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleEditClick(u)} className="text-slate-400 hover:text-white hover:bg-white/10">
                          Edit Plan
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Membership Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Membership</DialogTitle>
            <DialogDescription className="text-slate-400">
              Manage subscription for {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Plan</label>
              <Select value={editPlan} onValueChange={setEditPlan}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-white">
                  <SelectItem value="none">No Plan (Free)</SelectItem>
                  <SelectItem value="palladio_monthly">Pro Monthly</SelectItem>
                  <SelectItem value="palladio_annual">Pro Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editPlan !== 'none' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Status</label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white">
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="past_due">Past Due</SelectItem>
                    <SelectItem value="canceled">Canceled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
              Cancel
            </Button>
            <Button onClick={handleSaveMembership} className="bg-amber-600 hover:bg-amber-700 text-white border-0">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
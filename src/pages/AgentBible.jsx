import React, { useEffect, useState } from 'react';
import BackButton from "@/components/BackButton";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { BookOpen, ArrowLeft, ShieldAlert, Trash2, Pencil, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const CATEGORIES = [
  { value: 'compliance_insight', label: 'Compliance Insight', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
  { value: 'standard_interpretation', label: 'Standard Interpretation', color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
  { value: 'site_pattern', label: 'Site Pattern', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  { value: 'recurring_issue', label: 'Recurring Issue', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  { value: 'design_heuristic', label: 'Design Heuristic', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  { value: 'other', label: 'Other', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
];

const catMeta = (v) => CATEGORIES.find((c) => c.value === v) || CATEGORIES[CATEGORIES.length - 1];

export default function AgentBible() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [query, setQuery] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [busy, setBusy] = useState(false);

  const [editEntry, setEditEntry] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', category: 'compliance_insight', content: '', tags: '' });

  const fetchEntries = async () => {
    setBusy(true);
    try {
      const res = await base44.functions.invoke('manageAgentBible', { action: 'list' });
      setEntries(res.data?.entries || []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load Bible entries.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const u = await base44.auth.me();
        setUser(u);
        if (u?.role === 'admin') await fetchEntries();
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-[#0f1117] flex items-center justify-center text-white"><Loader2 className="animate-spin text-cyan-500" /></div>;
  }

  if (user?.role !== 'admin') {
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

  const filtered = entries.filter((e) => {
    const matchesCat = catFilter === 'all' || e.category === catFilter;
    const q = query.toLowerCase();
    const matchesQuery = !q || (e.title || '').toLowerCase().includes(q) || (e.content || '').toLowerCase().includes(q) || (e.tags || '').toLowerCase().includes(q);
    return matchesCat && matchesQuery;
  });

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this Bible entry? This cannot be undone.')) return;
    try {
      await base44.functions.invoke('manageAgentBible', { action: 'delete', id });
      setEntries((prev) => prev.filter((e) => e.id !== id));
      toast.success('Entry deleted.');
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete entry.');
    }
  };

  const openEdit = (entry) => {
    setEditEntry(entry);
    setEditForm({ title: entry.title || '', category: entry.category || 'compliance_insight', content: entry.content || '', tags: entry.tags || '' });
    setIsEditOpen(true);
  };

  const handleSaveEdit = async () => {
    try {
      await base44.functions.invoke('manageAgentBible', { action: 'update', id: editEntry.id, ...editForm });
      setEntries((prev) => prev.map((e) => (e.id === editEntry.id ? { ...e, ...editForm } : e)));
      setIsEditOpen(false);
      toast.success('Entry updated.');
    } catch (e) {
      console.error(e);
      toast.error('Failed to update entry.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1117] text-white p-6 pb-24">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-center gap-4 border-b border-white/10 pb-4">
          <BackButton aria-label="Go Back" className="hover:bg-white/10 rounded-full" />
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-700 flex items-center justify-center shadow-lg">
            <BookOpen size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Agent Bible</h1>
            <p className="text-slate-400 text-sm">Compliance knowledge the AI architect accumulates across assessments.</p>
          </div>
        </header>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search insights, tags…"
              className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-slate-500"
            />
          </div>
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="w-full sm:w-56 bg-white/5 border-white/10 text-white">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700 text-white">
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {busy ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-cyan-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <BookOpen size={40} className="mx-auto mb-3 opacity-40" />
            <p>No Bible entries yet. The agent logs a new insight after each plan assessment.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filtered.map((e) => {
              const meta = catMeta(e.category);
              return (
                <div key={e.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-md">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${meta.color}`}>{meta.label}</span>
                      {e.source && <span className="text-xs text-slate-500">via {e.source}</span>}
                    </div>
                    <div className="flex gap-1">
                      <Button aria-label="Edit" variant="ghost" size="icon" className="h-11 w-11 text-slate-400 hover:text-white hover:bg-white/10" onClick={() => openEdit(e)}>
                        <Pencil size={14} />
                      </Button>
                      <Button aria-label="Delete" variant="ghost" size="icon" className="h-11 w-11 text-slate-400 hover:text-red-400 hover:bg-red-500/10" onClick={() => handleDelete(e.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                  <h3 className="text-white font-semibold mb-1">{e.title}</h3>
                  <p className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">{e.content}</p>
                  {e.tags && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {e.tags.split(',').map((t) => t.trim()).filter(Boolean).map((t, i) => (
                        <span key={i} className="text-xs text-slate-400 bg-white/5 px-2 py-0.5 rounded">#{t}</span>
                      ))}
                    </div>
                  )}
                  {e.created_date && (
                    <p className="text-xs text-slate-600 mt-3">{new Date(e.created_date).toLocaleString()}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Edit Bible Entry</DialogTitle>
            <DialogDescription className="text-slate-400">Refine the insight, category, or tags.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Title</label>
              <Input value={editForm.title} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} className="bg-slate-800 border-slate-700 text-white" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Category</label>
              <Select value={editForm.category} onValueChange={(v) => setEditForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-white">
                  {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Content</label>
              <Textarea value={editForm.content} onChange={(e) => setEditForm((f) => ({ ...f, content: e.target.value }))} rows={6} className="bg-slate-800 border-slate-700 text-white" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Tags (comma separated)</label>
              <Input value={editForm.tags} onChange={(e) => setEditForm((f) => ({ ...f, tags: e.target.value }))} className="bg-slate-800 border-slate-700 text-white" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">Cancel</Button>
            <Button onClick={handleSaveEdit} className="bg-cyan-600 hover:bg-cyan-700 text-white border-0">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { Folder, Loader2, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function ChooseProject({ selected, onSelect, className, variant = 'outline', children }) {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Project.filter({}, '-created_date', 100);
      setProjects(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) loadProjects();
  }, [open]);

  const handlePick = (project) => {
    onSelect?.(project);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} className={className}>
          <Folder size={16} className="mr-2 shrink-0" />
          <span className="truncate">{selected ? selected.name : (children || 'Choose Project')}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#1a1d24] border-white/10 text-white shadow-2xl">
        <DialogHeader>
          <DialogTitle>Choose a Project</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-amber-500" /></div>
          ) : projects.length > 0 ? (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePick(p)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 hover:bg-slate-700 border border-white/5 transition-colors text-left"
                >
                  <Folder className="text-amber-500 shrink-0" size={18} />
                  <span className="text-sm font-medium truncate flex-1">{p.name}</span>
                  {selected?.id === p.id && <Check size={16} className="text-emerald-400 shrink-0" />}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-4">No projects yet. Create one from the Projects page first.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
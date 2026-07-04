import React, { useState, useEffect } from 'react';
import { Folder, Loader2, Plus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { uploadToFirebase } from '@/lib/uploadHelper';

export default function SaveToProject({ fileUrl, textContent, fileName, assetType = 'other', disabled, children, className, variant = 'outline', onSave, projectId }) {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

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

  const performSave = async (projectId) => {
    setSaving(true);
    try {
      if (onSave) {
        await onSave(projectId);
      } else {
        let finalFileUrl = fileUrl;
        if (!finalFileUrl && textContent) {
          const blob = new Blob([textContent], { type: 'text/markdown' });
          const file = new File([blob], fileName || 'report.md', { type: 'text/markdown' });
          const res = await uploadToFirebase(file);
          finalFileUrl = res.file_url;
        }
        if (!finalFileUrl) { toast.error("Nothing to save."); return; }
        await base44.entities.ProjectAsset.create({
          project_id: projectId,
          file_url: finalFileUrl,
          file_name: fileName,
          asset_type: assetType
        });
      }
      toast.success("Saved to project!");
      setOpen(false);
      setNewProjectName('');
    } catch (e) {
      console.error(e);
      toast.error("Failed to save to project");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAndSave = async () => {
    if (!newProjectName.trim()) return;
    setSaving(true);
    try {
      const newProj = await base44.entities.Project.create({ name: newProjectName.trim() });
      setProjects([newProj, ...projects]);
      await performSave(newProj.id);
    } catch (e) {
      console.error(e);
      toast.error("Failed to create project");
      setSaving(false);
    }
  };

  if (projectId) {
    return (
      <Button variant={variant} disabled={disabled || saving} className={className} onClick={() => performSave(projectId)}>
        {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : <Folder size={16} className="mr-2" />}
        {children || "Save to Project"}
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} disabled={disabled || saving} className={className}>
          {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : <Folder size={16} className="mr-2" />}
          {children || "Save to Project"}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#1a1d24] border-white/10 text-white shadow-2xl">
        <DialogHeader>
          <DialogTitle>Save to Project</DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-amber-500" /></div>
          ) : (
            <>
              {projects.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {projects.map(p => (
                    <button key={p.id} onClick={() => performSave(p.id)} disabled={saving}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 hover:bg-slate-700 border border-white/5 transition-colors text-left disabled:opacity-50">
                      <Folder className="text-amber-500 shrink-0" size={18} />
                      <span className="text-sm font-medium truncate">{p.name}</span>
                      {saving && <Loader2 size={14} className="animate-spin ml-auto" />}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">No projects yet. Create one below.</p>
              )}
              <div className="border-t border-white/10 pt-4">
                <p className="text-sm text-slate-400 mb-2">Create new project</p>
                <div className="flex gap-2">
                  <Input value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="Project name..." className="bg-[#0f1117] border-white/10 text-white" onKeyDown={e => e.key === 'Enter' && handleCreateAndSave()} />
                  <Button onClick={handleCreateAndSave} disabled={!newProjectName.trim() || saving} className="bg-amber-600 hover:bg-amber-700 text-white shrink-0">
                    <Plus size={16} />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
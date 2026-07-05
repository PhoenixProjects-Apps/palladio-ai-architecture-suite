import React, { useState } from 'react';
import { Loader2, FileText, Plus, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function ProjectDetailsForm({ value, onChange }) {
  const [lookingUp, setLookingUp] = useState(false);
  const [creating, setCreating] = useState(false);

  const set = (k, v) => onChange({ [k]: v });

  const handleCreateProject = async () => {
    if (!value.projectName.trim() || creating) return;
    setCreating(true);
    try {
      const proj = await base44.entities.Project.create({ name: value.projectName.trim() });
      onChange({ projectId: proj.id });
      toast.success('Project created — assessment will auto-save to it.');
    } catch (e) {
      console.error(e);
      toast.error('Could not create project');
    } finally {
      setCreating(false);
    }
  };

  const handleAddressSelect = async (addr) => {
    onChange({ address: addr, lotNo: '', rpNo: '', siteArea: '', councilOverlays: '' });
    setLookingUp(true);
    try {
      const res = await base44.functions.invoke('lookupPropertyDetails', { address: addr });
      if (res.data?.error) throw new Error(res.data.error);
      const data = res.data?.data || {};
      
      onChange({
        lotNo: data.lot_no || '',
        rpNo: data.rp_no || '',
        siteArea: data.site_area || '',
        councilOverlays: data.council_overlays_text || ''
      });
      if (!data.lot_no && !data.rp_no && !data.site_area && !data.council_overlays_text) {
        toast.info('Could not auto-detect property details. Please enter them manually.');
      }
    } catch (e) {
      console.error('Property lookup failed', e);
      toast.error('Could not auto-fill property details. Please enter them manually.');
    } finally {
      setLookingUp(false);
    }
  };

  const fieldClass = 'bg-white/5 border-white/10 text-white placeholder:text-slate-500 rounded-xl h-11';

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 overflow-hidden min-w-0">
      <div className="flex items-center gap-2 text-cyan-400 text-sm font-semibold">
        <FileText size={16} /> Project Details <span className="text-red-400 text-xs">*</span>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs text-slate-400">Project Name</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input value={value.projectName} onChange={(e) => onChange({ projectName: e.target.value, projectId: null })} placeholder="e.g. Altola St Extension" className={fieldClass} />
            {value.projectName.trim() && (
              <Button
                type="button"
                onClick={handleCreateProject}
                disabled={creating || !!value.projectId}
                className="bg-amber-600 hover:bg-amber-700 text-white shrink-0 px-4 h-11 w-full sm:w-auto flex items-center justify-center gap-2"
                title={value.projectId ? 'Project created' : 'Create a new project with this name'}
              >
                {creating ? <Loader2 size={18} className="animate-spin" /> : value.projectId ? <Check size={18} /> : <Plus size={18} />}
                <span className="sm:hidden">{value.projectId ? 'Created' : 'Create Project'}</span>
              </Button>
            )}
          </div>
          {value.projectId && <p className="text-xs text-emerald-400">Project created — assessment will auto-save to it.</p>}
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-slate-400">Client Name</label>
          <Input value={value.clientName} onChange={(e) => set('clientName', e.target.value)} placeholder="e.g. J. Smith" className={fieldClass} />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs text-slate-400">Site Address</label>
        <AddressAutocomplete value={value.address} onChange={(v) => set('address', v)} onSelect={handleAddressSelect} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs text-slate-400">Lot No.</label>
          <Input value={value.lotNo} onChange={(e) => set('lotNo', e.target.value)} placeholder="Auto-filled" disabled={lookingUp} className={fieldClass} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-slate-400">RP No.</label>
          <Input value={value.rpNo} onChange={(e) => set('rpNo', e.target.value)} placeholder="Auto-filled" disabled={lookingUp} className={fieldClass} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-slate-400">Site Area</label>
          <Input value={value.siteArea} onChange={(e) => set('siteArea', e.target.value)} placeholder="Auto-filled" disabled={lookingUp} className={fieldClass} />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs text-slate-400">Council Overlays</label>
        <Textarea value={value.councilOverlays} onChange={(e) => set('councilOverlays', e.target.value)} placeholder="Auto-filled" disabled={lookingUp} rows={2} className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 rounded-xl min-h-[88px] break-words" />
      </div>
      {lookingUp && (
        <div className="flex items-center gap-2 text-xs text-cyan-400">
          <Loader2 size={14} className="animate-spin" /> Looking up property details…
        </div>
      )}
    </div>
  );
}
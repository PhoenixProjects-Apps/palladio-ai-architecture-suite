import React, { useState } from 'react';
import { Loader2, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function ProjectDetailsForm({ value, onChange }) {
  const [lookingUp, setLookingUp] = useState(false);

  const set = (k, v) => onChange({ [k]: v });

  const handleAddressSelect = async (addr) => {
    onChange({ address: addr, lotNo: '', rpNo: '', siteArea: '', councilOverlays: '' });
    setLookingUp(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Look up the following Australian property and land administration details for this site address: "${addr}".

Find:
1. Lot Number
2. Registered Plan (RP) number
3. Site / lot area in square metres
4. Council planning overlays and zoning that apply to the site (e.g. flood overlay, bushfire, character, neighbourhood plan, etc.)

Return exactly what you find from official sources. Use an empty string for any field you cannot confirm. Do not invent values.`,
        add_context_from_internet: true,
        model: 'gemini_3_flash',
        response_json_schema: {
          type: 'object',
          properties: {
            lot_no: { type: 'string' },
            rp_no: { type: 'string' },
            site_area: { type: 'string' },
            council_overlays: { type: 'string' }
          }
        }
      });
      onChange({
        lotNo: res?.lot_no || '',
        rpNo: res?.rp_no || '',
        siteArea: res?.site_area || '',
        councilOverlays: res?.council_overlays || ''
      });
      if (!res?.lot_no && !res?.rp_no && !res?.site_area && !res?.council_overlays) {
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
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2 text-cyan-400 text-sm font-semibold">
        <FileText size={16} /> Project Details <span className="text-red-400 text-xs">*</span>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs text-slate-400">Project Name</label>
          <Input value={value.projectName} onChange={(e) => set('projectName', e.target.value)} placeholder="e.g. Altola St Extension" className={fieldClass} />
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
      <div className="grid sm:grid-cols-3 gap-3">
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
        <Textarea value={value.councilOverlays} onChange={(e) => set('councilOverlays', e.target.value)} placeholder="Auto-filled" disabled={lookingUp} rows={2} className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 rounded-xl" />
      </div>
      {lookingUp && (
        <div className="flex items-center gap-2 text-xs text-cyan-400">
          <Loader2 size={14} className="animate-spin" /> Looking up property details…
        </div>
      )}
    </div>
  );
}
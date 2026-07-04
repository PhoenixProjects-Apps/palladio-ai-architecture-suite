import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, ClipboardList, Loader2, AlertCircle, CheckCircle2, XCircle, HelpCircle, MapPin, ExternalLink, FileText, Layers, Download, Upload, File } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import ReactMarkdown from 'react-markdown';
import AddressAutocomplete from '../components/AddressAutocomplete';
import PalladioGate from '../components/PalladioGate';
import SaveToProject from '../components/SaveToProject';
import { toast } from 'sonner';
import { exportPlanningToPdf } from '@/lib/exportPlanningPdf';
import { uploadToFirebase } from '@/lib/uploadHelper';

const devTypes = [
"New Dwelling", "Extension/Addition", "Subdivision",
"Multi-unit Development", "Commercial/Retail", "Industrial",
"Change of Use", "Demolition", "Signage", "Other"];

function extractJson(text) {
  if (!text) return null;
  let s = String(text).trim().replace(/```json/gi, '').replace(/```/g, '').trim();
  try {return JSON.parse(s);} catch (_) {}
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    try {return JSON.parse(s.slice(start, end + 1));} catch (_) {}
  }
  return null;
}

// Polling functions removed to optimize mobile performance and reduce battery drain.

export default function PalladioPlanner() {
  const [activeTab, setActiveTab] = useState('assessment');

  const [address, setAddress] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [description, setDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);

  const [propertyData, setPropertyData] = useState({ 
    lot_rp: '', 
    lot_no: '',
    rp_no: '',
    site_area: '', 
    zoning: '', 
    zoning_confidence: '',
    neighbourhood_plan: '',
    overlays: [], 
    negative_overlay_checks: [],
    overlay_confidence: '',
    council_overlays_text: '',
    forms_and_applications: [],
    source_links: [],
    verification_notes: ''
  });
  const [isFetchingProperty, setIsFetchingProperty] = useState(false);

  // Document Analysis States
  const [docFile, setDocFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzingDoc, setIsAnalyzingDoc] = useState(false);
  const [docResult, setDocResult] = useState(null);
  const [exporting, setExporting] = useState(false);

  const buildPropertyResearchPrompt = (addr) => `
You are a property research assistant retrieving OFFICIAL Australian planning scheme data.

Research this property address:
${addr}

Use current public sources where available, including:
- the relevant local council planning scheme
- the council interactive mapping / property search tool
- state planning / title-style public information where available
- official development application form pages

CRITICAL REQUIREMENTS:

1. ZONING
Return the EXACT, SPECIFIC zone name used by the local planning scheme.
For Brisbane City Council under City Plan 2014, examples include:
- Low density residential zone
- Low-medium density residential zone
- Medium density residential zone
- Character residential zone
- Rural residential zone
- Mixed use zone
- Centre zone
- Community facilities zone
- Emerging community zone

Do NOT return generic labels like:
- Residential
- General Residential
- Housing
- Urban

If the exact zone cannot be verified, return:
"UNVERIFIED - manual confirmation required"

2. NEIGHBOURHOOD / LOCAL PLAN
Check whether the address is inside a neighbourhood plan, local plan, precinct, locality plan, or equivalent local planning area.
Return the exact name if verified.
If none is found, return:
"None verified"
If uncertain, return:
"UNVERIFIED - check council mapping tool"

3. POSITIVE OVERLAYS
Explicitly check these overlay categories one by one:
- Flood
- Bushfire
- Heritage / Traditional building character
- Airport environs / ANEF / OLS
- Road hierarchy / transport corridor
- Bicycle network
- Waterway corridor
- Biodiversity / environmental significance
- Landslide / steep land / slope constraint
- Coastal hazard
- Extractive resources
- Infrastructure / trunk infrastructure
- Acid sulfate soils
- Stormwater / overland flow
- Any other mapped local council overlay

Only include an overlay in "overlays" if there is genuine evidence it applies.

4. NEGATIVE OVERLAY CHECKS
If a major overlay category is checked and does NOT apply, store that as a negative check.
Example:
"No flood overlay detected"
"No bushfire overlay detected"
"No heritage overlay detected"

Do not confuse negative checks with positive overlays.

5. EMPTY OVERLAY RULE
If positive overlays cannot be confidently verified, DO NOT return an empty overlays array without explanation.
Instead:
overlays: ["UNVERIFIED - check council mapping tool"]
overlay_confidence: "LOW"

6. LOT / RP / SITE AREA
Return:
- lot_rp
- lot_no
- rp_no
- site_area

7. FORMS AND APPLICATIONS
Return links to the relevant local council's actual development application forms and property/planning search tools.

8. SOURCE LINKS
Return useful source links used or recommended, including council mapping/property search pages.

Return ONLY valid JSON matching this exact structure:

{
  "lot_rp": "Lot and RP numbers",
  "lot_no": "Lot number only",
  "rp_no": "Registered plan number only",
  "site_area": "Site area in square metres",
  "zoning": "Exact specific zone name or UNVERIFIED",
  "zoning_confidence": "HIGH | MEDIUM | LOW",
  "neighbourhood_plan": "Exact neighbourhood/local plan name, None verified, or UNVERIFIED",
  "overlays": ["Positive overlay 1", "Positive overlay 2"],
  "negative_overlay_checks": ["No flood overlay detected", "No bushfire overlay detected"],
  "overlay_confidence": "HIGH | MEDIUM | LOW",
  "forms_and_applications": [
    {
      "name": "Form or tool name",
      "link": "https://..."
    }
  ],
  "source_links": [
    {
      "name": "Source name",
      "link": "https://..."
    }
  ],
  "verification_notes": "Short note explaining any uncertainty or manual-check requirement."
}
`;

  const buildCouncilOverlaysText = (data = {}) => {
    const parts = [];

    if (data.zoning) {
      parts.push(`Zoning: ${data.zoning}`);
    }

    if (data.zoning_confidence) {
      parts.push(`Zoning confidence: ${data.zoning_confidence}`);
    }

    if (data.neighbourhood_plan) {
      parts.push(`Neighbourhood / Local Plan: ${data.neighbourhood_plan}`);
    }

    if (Array.isArray(data.overlays) && data.overlays.length > 0) {
      parts.push(`Positive overlays: ${data.overlays.join(', ')}`);
    } else {
      parts.push(`Positive overlays: UNVERIFIED - check council mapping tool`);
    }

    if (Array.isArray(data.negative_overlay_checks) && data.negative_overlay_checks.length > 0) {
      parts.push(`Negative overlay checks: ${data.negative_overlay_checks.join('; ')}`);
    }

    if (data.overlay_confidence) {
      parts.push(`Overlay confidence: ${data.overlay_confidence}`);
    }

    if (data.verification_notes) {
      parts.push(`Verification notes: ${data.verification_notes}`);
    }

    return parts.join('; ');
  };

  const isShallowLegacyCache = (record) => {
    const text = record?.council_overlays_text || '';

    return (
      (!record?.overlays || record.overlays.length === 0) &&
      !record?.neighbourhood_plan &&
      !record?.overlay_confidence &&
      (
        text.includes('No bushfire') ||
        text.includes('No flood') ||
        text.includes('No heritage')
      )
    );
  };

  const handleAddressSelect = async (addr) => {
    setAddress(addr);
  
    if (!addr) {
      setPropertyData({
        lot_rp: '',
        lot_no: '',
        rp_no: '',
        site_area: '',
        zoning: '',
        zoning_confidence: '',
        neighbourhood_plan: '',
        overlays: [],
        negative_overlay_checks: [],
        overlay_confidence: '',
        council_overlays_text: '',
        forms_and_applications: [],
        source_links: [],
        verification_notes: ''
      });
      return;
    }
  
    setIsFetchingProperty(true);
  
    try {
      // 1. Check cache first
      const cached = await base44.entities.PropertyCache.filter({ address: addr });
  
      if (cached && cached.length > 0 && !isShallowLegacyCache(cached[0])) {
        const record = cached[0];
  
        const hydrated = {
          lot_rp: record.lot_rp || '',
          lot_no: record.lot_no || '',
          rp_no: record.rp_no || '',
          site_area: record.site_area || '',
          zoning: record.zoning || '',
          zoning_confidence: record.zoning_confidence || '',
          neighbourhood_plan: record.neighbourhood_plan || '',
          overlays: Array.isArray(record.overlays) ? record.overlays : [],
          negative_overlay_checks: Array.isArray(record.negative_overlay_checks) ? record.negative_overlay_checks : [],
          overlay_confidence: record.overlay_confidence || '',
          council_overlays_text: record.council_overlays_text || '',
          forms_and_applications: Array.isArray(record.forms_and_applications) ? record.forms_and_applications : [],
          source_links: Array.isArray(record.source_links) ? record.source_links : [],
          verification_notes: record.verification_notes || ''
        };
  
        // Rebuild council text if old cache record is too shallow
        if (
          !hydrated.council_overlays_text ||
          hydrated.council_overlays_text.trim() === '' ||
          (
            hydrated.council_overlays_text.includes('No bushfire') &&
            hydrated.overlays.length === 0 &&
            !hydrated.neighbourhood_plan
          )
        ) {
          hydrated.council_overlays_text = buildCouncilOverlaysText(hydrated);
        }
  
        setPropertyData(hydrated);
        setIsFetchingProperty(false);
        return;
      }
  
      // 2. No cache found — research once
      const prompt = buildPropertyResearchPrompt(addr);
  
      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        model: 'gemini_3_flash',
        response_json_schema: {
          type: "object",
          properties: {
            lot_rp: { type: "string" },
            lot_no: { type: "string" },
            rp_no: { type: "string" },
            site_area: { type: "string" },
            zoning: { type: "string" },
            zoning_confidence: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
            neighbourhood_plan: { type: "string" },
            overlays: { type: "array", items: { type: "string" } },
            negative_overlay_checks: { type: "array", items: { type: "string" } },
            overlay_confidence: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
            forms_and_applications: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  link: { type: "string" }
                },
                required: ["name", "link"]
              }
            },
            source_links: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  link: { type: "string" }
                },
                required: ["name", "link"]
              }
            },
            verification_notes: { type: "string" }
          },
          required: [
            "lot_rp",
            "lot_no",
            "rp_no",
            "site_area",
            "zoning",
            "zoning_confidence",
            "neighbourhood_plan",
            "overlays",
            "negative_overlay_checks",
            "overlay_confidence",
            "forms_and_applications",
            "source_links",
            "verification_notes"
          ]
        }
      });
  
      const council_overlays_text = buildCouncilOverlaysText(response);
  
      const finalData = {
        address: addr,
        lot_rp: response.lot_rp || '',
        lot_no: response.lot_no || '',
        rp_no: response.rp_no || '',
        site_area: response.site_area || '',
        zoning: response.zoning || '',
        zoning_confidence: response.zoning_confidence || 'LOW',
        neighbourhood_plan: response.neighbourhood_plan || '',
        overlays: Array.isArray(response.overlays) ? response.overlays : ["UNVERIFIED - check council mapping tool"],
        negative_overlay_checks: Array.isArray(response.negative_overlay_checks) ? response.negative_overlay_checks : [],
        overlay_confidence: response.overlay_confidence || 'LOW',
        council_overlays_text,
        forms_and_applications: Array.isArray(response.forms_and_applications) ? response.forms_and_applications : [],
        source_links: Array.isArray(response.source_links) ? response.source_links : [],
        verification_notes: response.verification_notes || '',
        last_verified_at: new Date().toISOString()
      };
  
      // 3. Save rich cache
      await base44.entities.PropertyCache.create(finalData);
  
      // 4. Use rich data in UI
      setPropertyData(finalData);
  
    } catch (err) {
      console.error('Property lookup failed:', err);
  
      setPropertyData({
        lot_rp: '',
        lot_no: '',
        rp_no: '',
        site_area: '',
        zoning: 'UNVERIFIED - manual confirmation required',
        zoning_confidence: 'LOW',
        neighbourhood_plan: 'UNVERIFIED - check council mapping tool',
        overlays: ['UNVERIFIED - check council mapping tool'],
        negative_overlay_checks: [],
        overlay_confidence: 'LOW',
        council_overlays_text: 'UNVERIFIED - manual confirmation required. Check council mapping tool before relying on this assessment.',
        forms_and_applications: [],
        source_links: [],
        verification_notes: 'Automatic lookup failed.'
      });
  
    } finally {
      setIsFetchingProperty(false);
    }
  };

  const generatePrefilledForm = (formName) => {
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text("Planning Application Draft", 20, 20);

    doc.setFontSize(14);
    doc.text(`Form: ${formName}`, 20, 35);

    doc.setFontSize(12);
    doc.text("Property Details", 20, 50);

    doc.setFontSize(10);
    doc.text(`Address: ${address || 'N/A'}`, 20, 60);
    doc.text(`Lot / RP: ${propertyData?.lot_rp || 'N/A'}`, 20, 70);
    doc.text(`Site Area: ${propertyData?.site_area || 'N/A'}`, 20, 80);
    doc.text(`Zoning: ${propertyData?.zoning || 'N/A'}`, 20, 90);

    doc.setFontSize(12);
    doc.text("Development Details", 20, 110);

    doc.setFontSize(10);
    doc.text(`Type: ${selectedType || 'N/A'}`, 20, 120);

    doc.text("Description:", 20, 130);
    const splitDesc = doc.splitTextToSize(description || 'N/A', 170);
    doc.text(splitDesc, 20, 140);

    let yPos = 140 + splitDesc.length * 5 + 10;

    if (propertyData?.overlays?.length > 0) {
      doc.setFontSize(12);
      doc.text("Overlays", 20, yPos);
      doc.setFontSize(10);
      yPos += 10;
      propertyData.overlays.forEach((overlay) => {
        doc.text(`• ${overlay}`, 25, yPos);
        yPos += 6;
      });
    }

    doc.save(`Prefilled_Draft_${formName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
  };

  const handleAnalyze = async () => {
    if (!address || !selectedType || !description) return;
    setIsAnalyzing(true);
    try {
      const tokenRes = await base44.functions.invoke('consumeToken', {});
      if (tokenRes.data?.error) {
        toast.error("You don't have enough AI tokens. Please upgrade your plan.");
        setIsAnalyzing(false);
        return;
      }
      const response = await base44.functions.invoke('runPlanningAssessment', {
        address, devType: selectedType, description, propertyData
      });
      const data = response.data;
      if (data?.error) throw new Error(data.error);
      if (!data?.output) throw new Error('No assessment was returned.');
      setResult(data.output);
      toast.success("Assessment complete! Save to Project or Download PDF below.");
    } catch (err) {
      console.error(err);
      toast.error("The assessment could not be completed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDocUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setDocFile(file);
    setDocResult(null);
  };

  const handleAnalyzeDoc = async () => {
    if (!docFile) return;
    setIsUploading(true);
    setIsAnalyzingDoc(true);
    try {
      const tokenRes = await base44.functions.invoke('consumeToken', {});
      if (tokenRes.data?.error) {
        toast.error("You don't have enough AI tokens. Please upgrade your plan.");
        setIsUploading(false);
        setIsAnalyzingDoc(false);
        return;
      }
      const resFile = await uploadToFirebase(docFile);
      const file_url = resFile?.file_url;
      if (!file_url) throw new Error('Upload failed');
      setIsUploading(false);

      const analyzeRes = await base44.functions.invoke('analyzePlanDocument', { file_url });
      const data = analyzeRes.data;
      if (data?.error) throw new Error(data.error);
      setDocResult(data.output);
    } catch (err) {
      console.error(err);
      toast.error("The document could not be analyzed. Please try again.");
    } finally {
      setIsUploading(false);
      setIsAnalyzingDoc(false);
    }
  };

  const getVerdictColor = (v) => {
    if (v === "LIKELY PERMITTED") return { bg: "bg-green-500/20", border: "border-green-500/50", text: "text-green-400", icon: CheckCircle2 };
    if (v === "APPROVAL REQUIRED") return { bg: "bg-amber-500/20", border: "border-amber-500/50", text: "text-amber-400", icon: AlertCircle };
    if (v === "LIKELY REFUSED") return { bg: "bg-red-500/20", border: "border-red-500/50", text: "text-red-400", icon: XCircle };
    return { bg: "bg-violet-500/20", border: "border-violet-500/50", text: "text-violet-400", icon: HelpCircle };
  };

  return (
    <PalladioGate>
            <div className="min-h-screen bg-[#0f1117] text-white p-4 sm:p-6 pb-8">
                <div className="max-w-4xl mx-auto">
                    <header className="flex items-center gap-4 mb-8 border-b border-white/10 pb-4">
                    <Link to={createPageUrl('Home')}>
                        <Button variant="ghost" size="icon" className="hover:bg-white/10 rounded-full">
                            <ArrowLeft size={20} />
                        </Button>
                    </Link>
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center shadow-lg">
                            <ClipboardList size={20} />
                        </div>
                        <h1 className="font-bold text-xl">Town Planner AI</h1>
                    </header>

                    <div className="flex bg-slate-900 rounded-xl p-1 mb-8 w-full sm:w-max">
                        <button
              onClick={() => setActiveTab('assessment')}
              className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'assessment' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
              
                            Proposal Assessment
                        </button>
                        




            
                    </div>

                    {activeTab === 'assessment' &&
          <>
                            <div className="grid lg:grid-cols-2 gap-8 mb-8">
                        <div className="space-y-6">
                            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl space-y-6">
                                <div>
                                    <label className="text-sm font-medium text-slate-400 mb-2 block">1. Property Address</label>
                                    <AddressAutocomplete value={address} onChange={setAddress} onSelect={handleAddressSelect} />
                                    
                                    {isFetchingProperty &&
                    <div className="mt-4 flex items-center gap-2 text-sm text-rose-400 bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">
                                            <Loader2 size={16} className="animate-spin" />
                                            Searching public council records...
                                        </div>
                    }

                                    <div className="mt-4 space-y-3 bg-slate-900/50 p-4 rounded-xl border border-white/5 text-sm">
                                        <h4 className="font-semibold text-slate-200 flex items-center gap-2"><MapPin size={16} className="text-rose-500" /> Property Details</h4>
                                        <div className="grid grid-cols-2 gap-3 text-slate-300">
                                            <div>
                                                <span className="text-slate-500 block text-xs mb-1">Lot / RP</span>
                                                <input
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white"
                            value={propertyData.lot_rp || ''}
                            onChange={(e) => setPropertyData({ ...propertyData, lot_rp: e.target.value })}
                            placeholder="e.g. Lot 1 RP 12345"
                            disabled={isFetchingProperty} />
                          
                                            </div>
                                            <div>
                                                <span className="text-slate-500 block text-xs mb-1">Site Area</span>
                                                <input
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white"
                            value={propertyData.site_area || ''}
                            onChange={(e) => setPropertyData({ ...propertyData, site_area: e.target.value })}
                            placeholder="e.g. 600 sqm"
                            disabled={isFetchingProperty} />
                          
                                            </div>
                                            <div className="col-span-2">
                                                <span className="text-slate-500 text-xs mb-1 flex items-center gap-2">
                                                    Zoning
                                                    {propertyData.zoning_confidence && (
                                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                                                        propertyData.zoning_confidence === 'HIGH' ? 'bg-emerald-500/20 text-emerald-400' :
                                                        propertyData.zoning_confidence === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400' :
                                                        'bg-red-500/20 text-red-400'
                                                    }`}>
                                                        {propertyData.zoning_confidence} CONFIDENCE
                                                    </span>
                                                    )}
                                                </span>

                                                <input
                                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white mt-1"
                                                    value={propertyData.zoning || ''}
                                                    onChange={(e) => setPropertyData({ ...propertyData, zoning: e.target.value })}
                                                    placeholder="e.g. Low density residential zone"
                                                    disabled={isFetchingProperty}
                                                />
                                            </div>

                                            <div className="col-span-2">
                                                <span className="text-slate-500 text-xs mb-1 block">Neighbourhood / Local Plan</span>
                                                <input
                                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white mt-1"
                                                    value={propertyData.neighbourhood_plan || ''}
                                                    onChange={(e) => setPropertyData({ ...propertyData, neighbourhood_plan: e.target.value })}
                                                    placeholder="e.g. Carina-Carindale neighbourhood plan"
                                                    disabled={isFetchingProperty}
                                                />
                                            </div>

                                            <div className="col-span-2">
                                                <span className="text-slate-500 text-xs mb-1 flex items-center gap-2">
                                                    Positive Overlays
                                                    {propertyData.overlay_confidence && (
                                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                                                        propertyData.overlay_confidence === 'HIGH' ? 'bg-emerald-500/20 text-emerald-400' :
                                                        propertyData.overlay_confidence === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400' :
                                                        'bg-red-500/20 text-red-400'
                                                    }`}>
                                                        {propertyData.overlay_confidence} CONFIDENCE
                                                    </span>
                                                    )}
                                                </span>

                                                <textarea
                                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white mt-1"
                                                    value={Array.isArray(propertyData.overlays) ? propertyData.overlays.join('\n') : ''}
                                                    onChange={(e) => setPropertyData({
                                                    ...propertyData,
                                                    overlays: e.target.value.split('\n').map(x => x.trim()).filter(Boolean)
                                                    })}
                                                    placeholder="One overlay per line"
                                                    rows={3}
                                                    disabled={isFetchingProperty}
                                                />
                                            </div>

                                            <div className="col-span-2">
                                                <span className="text-slate-500 text-xs mb-1 block">Negative Overlay Checks</span>
                                                <textarea
                                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white mt-1"
                                                    value={Array.isArray(propertyData.negative_overlay_checks) ? propertyData.negative_overlay_checks.join('\n') : ''}
                                                    onChange={(e) => setPropertyData({
                                                    ...propertyData,
                                                    negative_overlay_checks: e.target.value.split('\n').map(x => x.trim()).filter(Boolean)
                                                    })}
                                                    placeholder="e.g. No flood overlay detected"
                                                    rows={3}
                                                    disabled={isFetchingProperty}
                                                />
                                            </div>

                                            {propertyData.verification_notes && (
                                            <div className="col-span-2 text-[10px] text-amber-400 mt-1">
                                                {propertyData.verification_notes}
                                            </div>
                                            )}
                                        </div>

                                        {propertyData.source_links?.length > 0 &&
                                        <div className="pt-4 border-t border-white/5">
                                            <span className="text-slate-500 block text-xs mb-2 flex items-center gap-1"><ExternalLink size={12} /> Source Links</span>
                                            <div className="space-y-2">
                                                {propertyData.source_links.map((link, idx) =>
                                                    <a key={idx} href={link.link} target="_blank" rel="noreferrer" className="flex items-center justify-between group hover:bg-white/5 p-2 rounded-lg border border-white/5 bg-black/20 transition-colors text-xs">
                                                        <span className="text-blue-400 group-hover:text-blue-300 transition-colors font-medium truncate pr-2">{link.name}</span>
                                                        <ExternalLink size={12} className="text-slate-500 group-hover:text-blue-300 shrink-0" />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                        }

                                        {propertyData.forms_and_applications?.length > 0 &&
                      <div className="pt-2 border-t border-white/5">
                                                <span className="text-slate-500 block text-xs mb-2 flex items-center gap-1"><FileText size={12} /> Relevant Forms & Applications</span>
                                                <div className="space-y-2">
                                                    {propertyData.forms_and_applications.map((form, idx) =>
                          <div key={idx} className="flex flex-col gap-2 p-2 rounded-lg border border-white/5 bg-black/20">
                                                            <a href={form.link} target="_blank" rel="noreferrer" className="flex items-center justify-between group hover:bg-white/5 p-1 rounded transition-colors text-xs">
                                                                <span className="text-rose-400 group-hover:text-rose-300 transition-colors font-medium">{form.name}</span>
                                                                <ExternalLink size={12} className="text-slate-500 group-hover:text-rose-300" />
                                                            </a>
                                                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => generatePrefilledForm(form.name)}
                              className="h-7 text-[10px] bg-rose-600/10 hover:bg-rose-600/20 border-rose-500/20 text-rose-300 w-full flex justify-center">
                              
                                                                <Download size={10} className="mr-1.5" /> Download Pre-filled Draft
                                                            </Button>
                                                        </div>
                          )}
                                                </div>
                                            </div>
                      }
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="text-sm font-medium text-slate-400 mb-2 block">2. Development Type</label>
                                    <div className="flex flex-wrap gap-2">
                                        {devTypes.map((t) =>
                      <button
                        key={t}
                        onClick={() => setSelectedType(t)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${selectedType === t ? 'bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'}`}>
                        
                                                {t}
                                            </button>
                      )}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-slate-400 mb-2 block">3. Project Description</label>
                                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe the proposed development (e.g., 'Double storey rear extension with new deck...')"
                      className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 min-h-[120px] rounded-xl" />
                    
                                </div>

                                <Button
                    onClick={handleAnalyze}
                    disabled={!address || !selectedType || !description || isAnalyzing}
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white h-12 rounded-xl shadow-lg shadow-rose-500/20">
                    
                                    {isAnalyzing ? <><Loader2 size={18} className="animate-spin mr-2" /> Assessing Proposal...</> : "Assess Proposal"}
                                </Button>
                            </div>
                        </div>

                        <div>
                            {result ?
                <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                                    {(() => {
                    const vc = getVerdictColor(result.verdict);
                    const Icon = vc.icon;
                    return (
                      <div className={`p-6 rounded-2xl border shadow-lg ${vc.bg} ${vc.border}`}>
                                                <div className="flex items-center gap-3 mb-2">
                                                    <Icon size={24} className={vc.text} />
                                                    <h2 className={`text-xl font-bold ${vc.text}`}>{result.verdict}</h2>
                                                </div>
                                                <p className="text-slate-200">{result.verdict_reason}</p>
                                            </div>);

                  })()}

                                    {result.red_flags?.length > 0 &&
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-5 shadow-sm">
                                            <h3 className="text-red-400 font-semibold mb-3 flex items-center gap-2"><AlertCircle size={16} /> Red Flags</h3>
                                            <ul className="space-y-2">
                                                {result.red_flags.map((rf, i) => <li key={i} className="text-red-200 text-sm flex gap-2"><span className="text-red-500">•</span>{rf}</li>)}
                                            </ul>
                                        </div>
                  }

                                    <div className="bg-white/5 border border-white/10 rounded-xl p-5 prose prose-invert max-w-none shadow-sm">
                                        <h3 className="text-rose-400 m-0 mb-3">Zoning Assessment</h3>
                                        <ReactMarkdown>{result.zoning_assessment}</ReactMarkdown>
                                    </div>

                                    {result.issues?.length > 0 &&
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5 shadow-sm">
                                            <h3 className="text-amber-400 font-semibold mb-3 flex items-center gap-2"><AlertCircle size={16} /> Key Issues</h3>
                                            <ul className="space-y-2">
                                                {result.issues.map((iss, i) => <li key={i} className="text-amber-200 text-sm flex gap-2"><span className="text-amber-500">•</span>{iss}</li>)}
                                            </ul>
                                        </div>
                  }
                                </div> :

                <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-white/5 border border-white/10 rounded-3xl border-dashed">
                                    <ClipboardList size={48} className="text-slate-600 mb-4" />
                                    <h3 className="text-lg font-medium text-slate-300 mb-2">Awaiting Assessment</h3>
                                    <p className="text-slate-500 text-sm">Fill out the details on the left and click assess to generate a comprehensive town planning report.</p>
                                </div>
                }
                        </div>
                    </div>

                    {result &&
            <div className="grid md:grid-cols-2 gap-6 animate-in fade-in duration-700 delay-300">
                            <div className="bg-white/5 border border-white/10 rounded-xl p-5 prose prose-invert max-w-none shadow-sm">
                                <h3 className="text-rose-400 m-0 mb-3">Planning Controls & Overlays</h3>
                                <ReactMarkdown>{result.planning_controls}</ReactMarkdown>
                                <ReactMarkdown>{result.overlays}</ReactMarkdown>
                            </div>
                            <div className="space-y-6">
                                <div className="bg-white/5 border border-white/10 rounded-xl p-5 prose prose-invert max-w-none shadow-sm">
                                    <h3 className="text-rose-400 m-0 mb-3">Neighbour Impact</h3>
                                    <ReactMarkdown>{result.neighbour_impact}</ReactMarkdown>
                                </div>
                                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5 shadow-sm">
                                    <h3 className="text-emerald-400 font-semibold mb-3 flex items-center gap-2"><CheckCircle2 size={16} /> Recommendations</h3>
                                    <ul className="space-y-2">
                                        {result.recommendations?.map((rec, i) => <li key={i} className="text-emerald-200 text-sm flex gap-2"><span className="text-emerald-500">•</span>{rec}</li>)}
                                    </ul>
                                </div>
                            </div>
                            <div className="md:col-span-2 bg-slate-800/50 p-4 rounded-xl text-xs text-slate-400 text-center">
                                {result.disclaimer || "This report is AI-generated for informational purposes. Consult a professional town planner."}
                            </div>
                            <div className="md:col-span-2 flex flex-col sm:flex-row gap-3">
                                <SaveToProject
                  textContent={`# Town Planning Assessment\n\n**Address:** ${address}\n**Development Type:** ${selectedType}\n**Description:** ${description}\n\n## Verdict: ${result.verdict}\n${result.verdict_reason}\n\n## Zoning Assessment\n${result.zoning_assessment}\n\n## Planning Controls\n${result.planning_controls}\n\n## Overlays\n${result.overlays}\n\n## Issues\n${(result.issues || []).map((i) => `- ${i}`).join('\n')}\n\n## Neighbour Impact\n${result.neighbour_impact}\n\n## Application Requirements\n${result.application_requirements}\n\n## Recommendations\n${(result.recommendations || []).map((r) => `- ${r}`).join('\n')}\n\n## Red Flags\n${(result.red_flags || []).map((r) => `- ${r}`).join('\n')}\n\n---\n${result.disclaimer || ''}`}
                  fileName="planning-assessment.md"
                  assetType="document"
                  className="w-full sm:flex-1 border-rose-500/50 text-rose-300 hover:bg-rose-500/10 h-12 rounded-xl" />
                                <Button
                  onClick={() => {
                    setExporting(true);
                    try {exportPlanningToPdf(result, { address, devType: selectedType, description, propertyData });}
                    catch (e) {console.error(e);toast.error('Could not generate PDF');} finally
                    {setExporting(false);}
                  }}
                  disabled={exporting}
                  className="w-full sm:flex-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white h-12">
                  {exporting ? <Loader2 size={16} className="animate-spin mr-2" /> : <Download size={16} className="mr-2" />}
                  Download PDF
                                </Button>
                            </div>
                        </div>
            }
                        </>
          }

                    {activeTab === 'document' &&
          <div className="grid lg:grid-cols-2 gap-8 mb-8">
                            <div className="space-y-6">
                                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl space-y-6">
                                    <div>
                                        <label className="text-sm font-medium text-slate-400 mb-3 block">Upload Planning Document</label>
                                        <div className="border-2 border-dashed border-white/10 hover:border-rose-500/50 rounded-2xl p-8 text-center transition-colors bg-slate-900 mb-6 relative group">
                                            {docFile ?
                    <div className="flex flex-col items-center">
                                                    <File size={32} className="text-rose-500 mb-2" />
                                                    <p className="text-white text-sm">{docFile.name}</p>
                                                </div> :

                    <div className="flex flex-col items-center">
                                                    <Upload size={32} className="text-slate-500 mb-2 group-hover:text-rose-400 transition-colors" />
                                                    <p className="text-sm font-medium text-white">Click or drag document here</p>
                                                    <p className="text-xs text-slate-500 mt-1">PDF, DOCX, TXT, Images</p>
                                                </div>
                    }
                                            <input type="file" onChange={handleDocUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".pdf,.doc,.docx,.txt,image/*" />
                                        </div>
                                    </div>
                                    
                                    <Button
                  onClick={handleAnalyzeDoc}
                  disabled={!docFile || isAnalyzingDoc}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white h-12 rounded-xl shadow-lg shadow-rose-500/20">
                  
                                        {isAnalyzingDoc ? <><Loader2 size={18} className="animate-spin mr-2" /> {isUploading ? 'Uploading...' : 'Analyzing Document...'}</> : "Analyze Document"}
                                    </Button>
                                </div>
                            </div>

                            <div>
                                {docResult ?
              <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                                        <div className="bg-white/5 border border-white/10 rounded-xl p-5 shadow-sm">
                                            <h3 className="text-rose-400 font-semibold mb-3">Document Summary</h3>
                                            <p className="text-slate-300 text-sm leading-relaxed">{docResult.summary}</p>
                                        </div>

                                        {docResult.key_information?.length > 0 &&
                <div className="bg-white/5 border border-white/10 rounded-xl p-5 shadow-sm">
                                                <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><FileText size={16} className="text-blue-400" /> Key Information</h3>
                                                <ul className="space-y-2">
                                                    {docResult.key_information.map((info, i) => <li key={i} className="text-slate-300 text-sm flex gap-2"><span className="text-blue-500">•</span>{info}</li>)}
                                                </ul>
                                            </div>
                }

                                        {docResult.compliance_issues?.length > 0 &&
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-5 shadow-sm">
                                                <h3 className="text-red-400 font-semibold mb-3 flex items-center gap-2"><AlertCircle size={16} /> Compliance Issues & Red Flags</h3>
                                                <ul className="space-y-2">
                                                    {docResult.compliance_issues.map((issue, i) => <li key={i} className="text-red-200 text-sm flex gap-2"><span className="text-red-500">•</span>{issue}</li>)}
                                                </ul>
                                            </div>
                }

                                        {docResult.requirements?.length > 0 &&
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5 shadow-sm">
                                                <h3 className="text-amber-400 font-semibold mb-3 flex items-center gap-2"><CheckCircle2 size={16} /> Requirements</h3>
                                                <ul className="space-y-2">
                                                    {docResult.requirements.map((req, i) => <li key={i} className="text-amber-200 text-sm flex gap-2"><span className="text-amber-500">•</span>{req}</li>)}
                                                </ul>
                                            </div>
                }
                                    </div> :

              <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-white/5 border border-white/10 rounded-3xl border-dashed">
                                        <FileText size={48} className="text-slate-600 mb-4" />
                                        <h3 className="text-lg font-medium text-slate-300 mb-2">Awaiting Document</h3>
                                        <p className="text-slate-500 text-sm">Upload a council report, property title, or planning document to extract key info and identify compliance issues.</p>
                                    </div>
              }
                            </div>
                        </div>
          }
                </div>
            </div>
        </PalladioGate>);
}
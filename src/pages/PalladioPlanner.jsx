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

const devTypes = [
    "New Dwelling", "Extension/Addition", "Subdivision", 
    "Multi-unit Development", "Commercial/Retail", "Industrial", 
    "Change of Use", "Demolition", "Signage", "Other"
];

export default function PalladioPlanner() {
    const [activeTab, setActiveTab] = useState('assessment');

    const [address, setAddress] = useState('');
    const [selectedType, setSelectedType] = useState('');
    const [description, setDescription] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState(null);

    const [propertyData, setPropertyData] = useState(null);
    const [isFetchingProperty, setIsFetchingProperty] = useState(false);

    // Document Analysis States
    const [docFile, setDocFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isAnalyzingDoc, setIsAnalyzingDoc] = useState(false);
    const [docResult, setDocResult] = useState(null);

    const handleAddressSelect = async (addr) => {
        setAddress(addr);
        if (!addr) {
            setPropertyData(null);
            return;
        }
        setIsFetchingProperty(true);
        setPropertyData(null);
        try {
            const prompt = `Search public council information and property databases for the address: ${addr}. Obtain the Lot & RP (Registered Plan) numbers, Site Area, zoning, and Overlays. Also provide links to relevant local council forms and applications for development.
Return a valid JSON object matching this structure:
{
    "lot_rp": "Lot and RP numbers",
    "site_area": "Site Area (e.g. 600 sqm)",
    "zoning": "Zoning description",
    "overlays": ["Overlay 1", "Overlay 2"],
    "forms_and_applications": [
        {"name": "Form Name", "link": "https://link-to-form.com"}
    ]
}`;
            const response = await base44.integrations.Core.InvokeLLM({
                prompt,
                add_context_from_internet: true,
                response_json_schema: {
                    type: "object",
                    properties: {
                        lot_rp: { type: "string" },
                        site_area: { type: "string" },
                        zoning: { type: "string" },
                        overlays: { type: "array", items: { type: "string" } },
                        forms_and_applications: { 
                            type: "array", 
                            items: { 
                                type: "object", 
                                properties: { name: { type: "string" }, link: { type: "string" } },
                                required: ["name", "link"]
                            } 
                        }
                    },
                    required: ["lot_rp", "site_area", "zoning", "overlays", "forms_and_applications"]
                }
            });
            setPropertyData(response);
        } catch (err) {
            console.error(err);
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
        
        let yPos = 140 + (splitDesc.length * 5) + 10;
        
        if (propertyData?.overlays?.length > 0) {
            doc.setFontSize(12);
            doc.text("Overlays", 20, yPos);
            doc.setFontSize(10);
            yPos += 10;
            propertyData.overlays.forEach(overlay => {
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
            const prompt = `Act as an expert Australian Town Planner. Assess this proposed development:
Address: ${address}
Type: ${selectedType}
Description: ${description}

Search local planning schemes and zoning for this address.
Return a valid JSON object matching this structure:
{
    "verdict": "LIKELY PERMITTED" | "APPROVAL REQUIRED" | "LIKELY REFUSED" | "COMPLEX - SEEK ADVICE",
    "verdict_reason": "Short explanation of the verdict",
    "zoning_assessment": "Markdown text about zoning compatibility",
    "planning_controls": "Markdown text about relevant codes",
    "overlays": "Markdown text about overlays (heritage, bushfire, etc)",
    "issues": ["Issue 1", "Issue 2"],
    "neighbour_impact": "Markdown text about impact on neighbours",
    "application_requirements": "Markdown text about what to submit",
    "recommendations": ["Rec 1", "Rec 2"],
    "red_flags": ["Flag 1"],
    "disclaimer": "Standard disclaimer"
}`;

            const response = await base44.integrations.Core.InvokeLLM({
                prompt,
                add_context_from_internet: true,
                response_json_schema: {
                    type: "object",
                    properties: {
                        verdict: { type: "string" },
                        verdict_reason: { type: "string" },
                        zoning_assessment: { type: "string" },
                        planning_controls: { type: "string" },
                        overlays: { type: "string" },
                        issues: { type: "array", items: { type: "string" } },
                        neighbour_impact: { type: "string" },
                        application_requirements: { type: "string" },
                        recommendations: { type: "array", items: { type: "string" } },
                        red_flags: { type: "array", items: { type: "string" } },
                        disclaimer: { type: "string" }
                    }
                }
            });
            setResult(response);
        } catch (err) {
            console.error(err);
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
            const { file_url } = await base44.integrations.Core.UploadFile({ file: docFile });
            setIsUploading(false);

            const prompt = `Analyze this uploaded planning document (e.g. council report, property title, scheme code). 
Extract the key information, provide a concise summary, and identify any potential compliance issues, red flags, or specific requirements mentioned.
Return a valid JSON object matching this structure:
{
    "summary": "Concise summary of the document",
    "key_information": ["Key point 1", "Key point 2"],
    "compliance_issues": ["Potential issue 1", "Potential issue 2"],
    "requirements": ["Requirement 1", "Requirement 2"]
}`;
            const response = await base44.integrations.Core.InvokeLLM({
                prompt,
                file_urls: [file_url],
                response_json_schema: {
                    type: "object",
                    properties: {
                        summary: { type: "string" },
                        key_information: { type: "array", items: { type: "string" } },
                        compliance_issues: { type: "array", items: { type: "string" } },
                        requirements: { type: "array", items: { type: "string" } }
                    }
                }
            });
            setDocResult(response);
        } catch (err) {
            console.error(err);
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
            <div className="min-h-screen bg-[#0f1117] text-white p-6 pb-20">
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
                        <h1 className="text-2xl font-bold">Town Planner AI</h1>
                    </header>

                    <div className="flex bg-slate-900 rounded-xl p-1 mb-8 w-max">
                        <button 
                            onClick={() => setActiveTab('assessment')}
                            className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'assessment' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            Proposal Assessment
                        </button>
                        <button 
                            onClick={() => setActiveTab('document')}
                            className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'document' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            Document Analysis
                        </button>
                    </div>

                    {activeTab === 'assessment' && (
                        <>
                            <div className="grid lg:grid-cols-2 gap-8 mb-8">
                        <div className="space-y-6">
                            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl space-y-6">
                                <div>
                                    <label className="text-sm font-medium text-slate-400 mb-2 block">1. Property Address</label>
                                    <AddressAutocomplete value={address} onChange={setAddress} onSelect={handleAddressSelect} />
                                    
                                    {isFetchingProperty && (
                                        <div className="mt-4 flex items-center gap-2 text-sm text-rose-400 bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">
                                            <Loader2 size={16} className="animate-spin" />
                                            Searching public council records...
                                        </div>
                                    )}

                                    {propertyData && !isFetchingProperty && (
                                        <div className="mt-4 space-y-3 bg-slate-900/50 p-4 rounded-xl border border-white/5 text-sm">
                                            <h4 className="font-semibold text-slate-200 flex items-center gap-2"><MapPin size={16} className="text-rose-500"/> Property Details</h4>
                                            <div className="grid grid-cols-2 gap-3 text-slate-300">
                                                <div><span className="text-slate-500 block text-xs">Lot / RP</span>{propertyData.lot_rp || 'N/A'}</div>
                                                <div><span className="text-slate-500 block text-xs">Site Area</span>{propertyData.site_area || 'N/A'}</div>
                                                <div className="col-span-2"><span className="text-slate-500 block text-xs">Zoning</span>{propertyData.zoning || 'N/A'}</div>
                                            </div>
                                            
                                            {propertyData.overlays?.length > 0 && (
                                                <div className="pt-2 border-t border-white/5">
                                                    <span className="text-slate-500 block text-xs mb-1 flex items-center gap-1"><Layers size={12}/> Overlays</span>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {propertyData.overlays.map((overlay, idx) => (
                                                            <span key={idx} className="bg-white/10 px-2 py-0.5 rounded text-xs text-slate-300">{overlay}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {propertyData.forms_and_applications?.length > 0 && (
                                                <div className="pt-2 border-t border-white/5">
                                                    <span className="text-slate-500 block text-xs mb-2 flex items-center gap-1"><FileText size={12}/> Relevant Forms & Applications</span>
                                                    <div className="space-y-2">
                                                        {propertyData.forms_and_applications.map((form, idx) => (
                                                            <div key={idx} className="flex flex-col gap-2 p-2 rounded-lg border border-white/5 bg-black/20">
                                                                <a href={form.link} target="_blank" rel="noreferrer" className="flex items-center justify-between group hover:bg-white/5 p-1 rounded transition-colors text-xs">
                                                                    <span className="text-rose-400 group-hover:text-rose-300 transition-colors font-medium">{form.name}</span>
                                                                    <ExternalLink size={12} className="text-slate-500 group-hover:text-rose-300" />
                                                                </a>
                                                                <Button 
                                                                    variant="outline" 
                                                                    size="sm" 
                                                                    onClick={() => generatePrefilledForm(form.name)}
                                                                    className="h-7 text-[10px] bg-rose-600/10 hover:bg-rose-600/20 border-rose-500/20 text-rose-300 w-full flex justify-center"
                                                                >
                                                                    <Download size={10} className="mr-1.5" /> Download Pre-filled Draft
                                                                </Button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                
                                <div>
                                    <label className="text-sm font-medium text-slate-400 mb-2 block">2. Development Type</label>
                                    <div className="flex flex-wrap gap-2">
                                        {devTypes.map(t => (
                                            <button 
                                                key={t}
                                                onClick={() => setSelectedType(t)}
                                                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${selectedType === t ? 'bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'}`}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-slate-400 mb-2 block">3. Project Description</label>
                                    <Textarea 
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        placeholder="Describe the proposed development (e.g., 'Double storey rear extension with new deck...')"
                                        className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 min-h-[120px] rounded-xl"
                                    />
                                </div>

                                <Button 
                                    onClick={handleAnalyze}
                                    disabled={!address || !selectedType || !description || isAnalyzing}
                                    className="w-full bg-rose-600 hover:bg-rose-700 text-white h-12 rounded-xl shadow-lg shadow-rose-500/20"
                                >
                                    {isAnalyzing ? <><Loader2 size={18} className="animate-spin mr-2" /> Assessing Proposal...</> : "Assess Proposal"}
                                </Button>
                            </div>
                        </div>

                        <div>
                            {result ? (
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
                                            </div>
                                        );
                                    })()}

                                    {result.red_flags?.length > 0 && (
                                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-5 shadow-sm">
                                            <h3 className="text-red-400 font-semibold mb-3 flex items-center gap-2"><AlertCircle size={16} /> Red Flags</h3>
                                            <ul className="space-y-2">
                                                {result.red_flags.map((rf, i) => <li key={i} className="text-red-200 text-sm flex gap-2"><span className="text-red-500">•</span>{rf}</li>)}
                                            </ul>
                                        </div>
                                    )}

                                    <div className="bg-white/5 border border-white/10 rounded-xl p-5 prose prose-invert max-w-none shadow-sm">
                                        <h3 className="text-rose-400 m-0 mb-3">Zoning Assessment</h3>
                                        <ReactMarkdown>{result.zoning_assessment}</ReactMarkdown>
                                    </div>

                                    {result.issues?.length > 0 && (
                                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5 shadow-sm">
                                            <h3 className="text-amber-400 font-semibold mb-3 flex items-center gap-2"><AlertCircle size={16} /> Key Issues</h3>
                                            <ul className="space-y-2">
                                                {result.issues.map((iss, i) => <li key={i} className="text-amber-200 text-sm flex gap-2"><span className="text-amber-500">•</span>{iss}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-white/5 border border-white/10 rounded-3xl border-dashed">
                                    <ClipboardList size={48} className="text-slate-600 mb-4" />
                                    <h3 className="text-lg font-medium text-slate-300 mb-2">Awaiting Assessment</h3>
                                    <p className="text-slate-500 text-sm">Fill out the details on the left and click assess to generate a comprehensive town planning report.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {result && (
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
                        </div>
                    )}
                        </>
                    )}

                    {activeTab === 'document' && (
                        <div className="grid lg:grid-cols-2 gap-8 mb-8">
                            <div className="space-y-6">
                                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl space-y-6">
                                    <div>
                                        <label className="text-sm font-medium text-slate-400 mb-3 block">Upload Planning Document</label>
                                        <div className="border-2 border-dashed border-white/10 hover:border-rose-500/50 rounded-2xl p-8 text-center transition-colors bg-slate-900 mb-6 relative group">
                                            {docFile ? (
                                                <div className="flex flex-col items-center">
                                                    <File size={32} className="text-rose-500 mb-2" />
                                                    <p className="text-white text-sm">{docFile.name}</p>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center">
                                                    <Upload size={32} className="text-slate-500 mb-2 group-hover:text-rose-400 transition-colors" />
                                                    <p className="text-sm font-medium text-white">Click or drag document here</p>
                                                    <p className="text-xs text-slate-500 mt-1">PDF, DOCX, TXT, Images</p>
                                                </div>
                                            )}
                                            <input type="file" onChange={handleDocUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".pdf,.doc,.docx,.txt,image/*" />
                                        </div>
                                    </div>
                                    
                                    <Button 
                                        onClick={handleAnalyzeDoc}
                                        disabled={!docFile || isAnalyzingDoc}
                                        className="w-full bg-rose-600 hover:bg-rose-700 text-white h-12 rounded-xl shadow-lg shadow-rose-500/20"
                                    >
                                        {isAnalyzingDoc ? <><Loader2 size={18} className="animate-spin mr-2" /> {isUploading ? 'Uploading...' : 'Analyzing Document...'}</> : "Analyze Document"}
                                    </Button>
                                </div>
                            </div>

                            <div>
                                {docResult ? (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                                        <div className="bg-white/5 border border-white/10 rounded-xl p-5 shadow-sm">
                                            <h3 className="text-rose-400 font-semibold mb-3">Document Summary</h3>
                                            <p className="text-slate-300 text-sm leading-relaxed">{docResult.summary}</p>
                                        </div>

                                        {docResult.key_information?.length > 0 && (
                                            <div className="bg-white/5 border border-white/10 rounded-xl p-5 shadow-sm">
                                                <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><FileText size={16} className="text-blue-400" /> Key Information</h3>
                                                <ul className="space-y-2">
                                                    {docResult.key_information.map((info, i) => <li key={i} className="text-slate-300 text-sm flex gap-2"><span className="text-blue-500">•</span>{info}</li>)}
                                                </ul>
                                            </div>
                                        )}

                                        {docResult.compliance_issues?.length > 0 && (
                                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-5 shadow-sm">
                                                <h3 className="text-red-400 font-semibold mb-3 flex items-center gap-2"><AlertCircle size={16} /> Compliance Issues & Red Flags</h3>
                                                <ul className="space-y-2">
                                                    {docResult.compliance_issues.map((issue, i) => <li key={i} className="text-red-200 text-sm flex gap-2"><span className="text-red-500">•</span>{issue}</li>)}
                                                </ul>
                                            </div>
                                        )}

                                        {docResult.requirements?.length > 0 && (
                                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5 shadow-sm">
                                                <h3 className="text-amber-400 font-semibold mb-3 flex items-center gap-2"><CheckCircle2 size={16} /> Requirements</h3>
                                                <ul className="space-y-2">
                                                    {docResult.requirements.map((req, i) => <li key={i} className="text-amber-200 text-sm flex gap-2"><span className="text-amber-500">•</span>{req}</li>)}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-white/5 border border-white/10 rounded-3xl border-dashed">
                                        <FileText size={48} className="text-slate-600 mb-4" />
                                        <h3 className="text-lg font-medium text-slate-300 mb-2">Awaiting Document</h3>
                                        <p className="text-slate-500 text-sm">Upload a council report, property title, or planning document to extract key info and identify compliance issues.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </PalladioGate>
    );
}
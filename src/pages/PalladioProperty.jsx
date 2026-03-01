import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, MapPin, Loader2, AlertTriangle, Building, Home as HomeIcon, TrendingUp, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import ReactMarkdown from 'react-markdown';
import AddressAutocomplete from '../components/AddressAutocomplete';
import PalladioGate from '../components/PalladioGate';

export default function PalladioProperty() {
    const [address, setAddress] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [result, setResult] = useState(null);

    const handleSearch = async () => {
        if (!address) return;
        setIsSearching(true);
        try {
            const prompt = `Provide a detailed property intelligence report for the following address in Australia: "${address}". 
            Search the web for zoning info, local planning scheme details, development potential, and neighbourhood insights.
            You MUST return the output as a valid JSON object matching this exact structure:
            {
                "overview": "Brief summary",
                "zoning": "Markdown text about zoning",
                "development_potential": "Markdown text about what can be built",
                "neighbourhood": "Markdown text about the area",
                "planning_trends": "Markdown text about local council trends",
                "key_facts": [{"label": "Fact Title", "value": "Fact Value"}],
                "disclaimer": "Standard disclaimer about verifying with council"
            }`;

            const response = await base44.integrations.Core.InvokeLLM({
                prompt,
                add_context_from_internet: true,
                response_json_schema: {
                    type: "object",
                    properties: {
                        overview: { type: "string" },
                        zoning: { type: "string" },
                        development_potential: { type: "string" },
                        neighbourhood: { type: "string" },
                        planning_trends: { type: "string" },
                        key_facts: { type: "array", items: { type: "object", properties: { label: { type: "string" }, value: { type: "string" } } } },
                        disclaimer: { type: "string" }
                    }
                }
            });
            setResult(response);
        } catch (err) {
            console.error(err);
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <PalladioGate>
            <div className="min-h-screen bg-[#0f1117] text-white p-6">
                <div className="max-w-4xl mx-auto">
                    <header className="flex items-center gap-4 mb-8 border-b border-white/10 pb-4">
                        <Link to={createPageUrl('Home')}>
                            <Button variant="ghost" size="icon" className="hover:bg-white/10 rounded-full">
                                <ArrowLeft size={20} />
                            </Button>
                        </Link>
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg">
                            <MapPin size={20} />
                        </div>
                        <h1 className="text-2xl font-bold">Property Intelligence</h1>
                    </header>

                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 mb-8 shadow-xl">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1">
                                <label className="text-sm font-medium text-slate-400 mb-2 block">Property Address (Australia)</label>
                                <AddressAutocomplete value={address} onChange={setAddress} onSelect={setAddress} />
                            </div>
                            <div className="flex items-end">
                                <Button 
                                    onClick={handleSearch}
                                    disabled={!address || isSearching}
                                    className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-8 h-12 rounded-xl shadow-lg shadow-emerald-500/20"
                                >
                                    {isSearching ? <Loader2 size={18} className="animate-spin mr-2" /> : <MapPin size={18} className="mr-2" />}
                                    Analyze Property
                                </Button>
                            </div>
                        </div>
                    </div>

                    {result && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-2xl p-6 shadow-lg">
                                <h3 className="text-emerald-400 font-semibold mb-2 flex items-center gap-2"><Info size={18} /> Overview</h3>
                                <p className="text-slate-200 leading-relaxed">{result.overview}</p>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {result.key_facts?.map((fact, i) => (
                                    <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 shadow-md">
                                        <p className="text-xs text-slate-400 mb-1">{fact.label}</p>
                                        <p className="font-semibold text-white">{fact.value}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 prose prose-invert max-w-none shadow-md">
                                    <h3 className="text-emerald-400 flex items-center gap-2 m-0 mb-4"><MapPin size={20} /> Zoning & Overlays</h3>
                                    <ReactMarkdown>{result.zoning}</ReactMarkdown>
                                </div>
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 prose prose-invert max-w-none shadow-md">
                                    <h3 className="text-emerald-400 flex items-center gap-2 m-0 mb-4"><Building size={20} /> Development Potential</h3>
                                    <ReactMarkdown>{result.development_potential}</ReactMarkdown>
                                </div>
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 prose prose-invert max-w-none shadow-md">
                                    <h3 className="text-emerald-400 flex items-center gap-2 m-0 mb-4"><HomeIcon size={20} /> Neighbourhood</h3>
                                    <ReactMarkdown>{result.neighbourhood}</ReactMarkdown>
                                </div>
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 prose prose-invert max-w-none shadow-md">
                                    <h3 className="text-emerald-400 flex items-center gap-2 m-0 mb-4"><TrendingUp size={20} /> Planning Trends</h3>
                                    <ReactMarkdown>{result.planning_trends}</ReactMarkdown>
                                </div>
                            </div>

                            <div className="bg-amber-900/20 border border-amber-500/30 rounded-2xl p-4 flex gap-3 text-sm text-amber-200">
                                <AlertTriangle size={20} className="shrink-0 text-amber-500" />
                                <p>{result.disclaimer || "Disclaimer: This information is AI-generated and for indicative purposes only. Always verify with the local council and a qualified town planner before making financial or development decisions."}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </PalladioGate>
    );
}
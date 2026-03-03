import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Layers, Loader2, Upload, Box, Download, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import ReactMarkdown from 'react-markdown';
import PalladioGate from '../components/PalladioGate';
import Floorplan3DViewer from '../components/Floorplan3DViewer';

export default function PalladioFloorplan() {
    const [tab, setTab] = useState('text'); // 'text' or 'cad'
    
    // Tab 1 state
    const [desc, setDesc] = useState('');
    const [isGeneratingText, setIsGeneratingText] = useState(false);
    const [textResult, setTextResult] = useState({ layout: null, image: null });
    const [show3DViewer, setShow3DViewer] = useState(false);

    // Tab 2 state
    const [cadFile, setCadFile] = useState(null);
    const [cadFileUrl, setCadFileUrl] = useState(null);
    const [isGeneratingSketch, setIsGeneratingSketch] = useState(false);
    const [sketchResult, setSketchResult] = useState(null);
    const fileInputRef = useRef(null);

    const handleTextGenerate = async () => {
        if (!desc) return;
        setIsGeneratingText(true);
        try {
            const layoutPrompt = `Act as an architect. Create a detailed layout brief for: ${desc}. Include specific room dimensions (e.g. 4m x 5m) and relationships.`;
            const imagePrompt = `Architectural floorplan blueprint, top-down view, 2D layout, high quality, professional CAD drawing style. Description: ${desc}`;

            const [layoutRes, imageRes] = await Promise.all([
                base44.integrations.Core.InvokeLLM({ prompt: layoutPrompt }),
                base44.integrations.Core.GenerateImage({ prompt: imagePrompt })
            ]);

            setTextResult({ layout: layoutRes, image: imageRes.url });
        } catch (err) {
            console.error(err);
        } finally {
            setIsGeneratingText(false);
        }
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setCadFile(file);
        try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            setCadFileUrl(file_url);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSketchGenerate = async () => {
        if (!cadFileUrl) return;
        setIsGeneratingSketch(true);
        try {
            const imagePrompt = `A neat, professional, coloured 2D architectural floorplan with dimensions and furniture, top-down view, high quality. The layout should match the provided sketch perfectly.`;

            const imageRes = await base44.integrations.Core.GenerateImage({ 
                prompt: imagePrompt, 
                existing_image_urls: [cadFileUrl] 
            });

            setSketchResult(imageRes.url);
        } catch (err) {
            console.error(err);
        } finally {
            setIsGeneratingSketch(false);
        }
    };

    return (
        <PalladioGate>
            {show3DViewer && <Floorplan3DViewer layoutText={textResult.layout} onClose={() => setShow3DViewer(false)} />}
            
            <div className="min-h-screen bg-[#0f1117] text-white p-6 pb-24">
                <div className="max-w-5xl mx-auto">
                    <header className="flex items-center gap-4 mb-8 border-b border-white/10 pb-4">
                        <Link to={createPageUrl('Home')}>
                            <Button variant="ghost" size="icon" className="hover:bg-white/10 rounded-full">
                                <ArrowLeft size={20} />
                            </Button>
                        </Link>
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-lg">
                            <Layers size={20} />
                        </div>
                        <h1 className="text-2xl font-bold">Generate Floorplans</h1>
                    </header>

                    {/* Tabs */}
                    <div className="flex bg-slate-900 rounded-xl p-1 mb-8 w-max">
                        <button 
                            onClick={() => setTab('text')}
                            className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === 'text' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            Generate from Text
                        </button>
                        <button 
                            onClick={() => setTab('sketch')}
                            className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === 'sketch' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            Sketch to Floorplan
                        </button>
                    </div>

                    {tab === 'text' && (
                        <div className="grid lg:grid-cols-2 gap-8">
                            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl space-y-6">
                                <div>
                                    <label className="text-sm font-medium text-slate-400 mb-3 block">Describe your space</label>
                                    <Textarea 
                                        value={desc}
                                        onChange={e => setDesc(e.target.value)}
                                        placeholder="E.g., A 3 bedroom, 2 bathroom family home with an open plan kitchen/living area..."
                                        className="bg-slate-900 border-slate-700 text-white min-h-[120px] rounded-xl mb-3"
                                    />
                                    <div className="flex flex-wrap gap-2">
                                        {['3 bed 2 bath family home', 'Modern studio apartment', 'Commercial office space', 'Cafe fitout'].map(p => (
                                            <button 
                                                key={p} onClick={() => setDesc(p)}
                                                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-full transition-colors"
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <Button 
                                    onClick={handleTextGenerate}
                                    disabled={!desc || isGeneratingText}
                                    className="w-full bg-violet-600 hover:bg-violet-700 text-white h-12 rounded-xl shadow-lg shadow-violet-500/20"
                                >
                                    {isGeneratingText ? <><Loader2 size={18} className="animate-spin mr-2" /> Generating...</> : "Generate Floorplan"}
                                </Button>
                            </div>

                            <div>
                                {textResult.layout ? (
                                    <div className="space-y-6 animate-in fade-in duration-500">
                                        {textResult.image && (
                                            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-lg">
                                                <img src={textResult.image} alt="Generated floorplan" className="w-full h-auto" />
                                            </div>
                                        )}
                                        <Button 
                                            onClick={() => setShow3DViewer(true)}
                                            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white h-12 rounded-xl shadow-lg shadow-cyan-500/20"
                                        >
                                            <Box size={18} className="mr-2" /> View in 3D
                                        </Button>
                                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 prose prose-invert max-w-none text-sm">
                                            <h3 className="text-violet-400 mt-0">Layout Brief</h3>
                                            <ReactMarkdown>{textResult.layout}</ReactMarkdown>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-white/5 border border-white/10 rounded-3xl border-dashed">
                                        <Layers size={48} className="text-slate-600 mb-4" />
                                        <h3 className="text-lg font-medium text-slate-300">No floorplan generated</h3>
                                        <p className="text-slate-500 text-sm mt-2">Describe your requirements to generate a plan and 3D model.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {tab === 'sketch' && (
                        <div className="grid lg:grid-cols-2 gap-8">
                            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl space-y-6">
                                <div>
                                    <label className="text-sm font-medium text-slate-400 mb-3 block">Upload existing floorplan sketch</label>
                                    <div 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="border-2 border-dashed border-white/10 hover:border-violet-500/50 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-slate-900 mb-6"
                                    >
                                        {cadFile ? (
                                            <div className="flex flex-col items-center">
                                                <ImageIcon size={32} className="text-violet-500 mb-2" />
                                                <p className="text-white text-sm">{cadFile.name}</p>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center">
                                                <Upload size={32} className="text-slate-500 mb-2" />
                                                <p className="text-sm font-medium text-white">Click or drag image here</p>
                                            </div>
                                        )}
                                        <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
                                    </div>
                                </div>
                                <Button 
                                    onClick={handleSketchGenerate}
                                    disabled={!cadFileUrl || isGeneratingSketch}
                                    className="w-full bg-violet-600 hover:bg-violet-700 text-white h-12 rounded-xl shadow-lg shadow-violet-500/20"
                                >
                                    {isGeneratingSketch ? <><Loader2 size={18} className="animate-spin mr-2" /> Generating...</> : "Generate Professional Floorplan"}
                                </Button>
                            </div>

                            <div>
                                {sketchResult ? (
                                    <div className="space-y-6 animate-in fade-in duration-500">
                                        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-lg p-4">
                                            <img src={sketchResult} alt="Generated Floorplan" className="w-full rounded-lg" />
                                        </div>
                                        <a 
                                            href={sketchResult} 
                                            download="floorplan.png" 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="block w-full"
                                        >
                                            <Button className="w-full bg-white text-black hover:bg-slate-200 h-12 rounded-xl">
                                                <Download size={18} className="mr-2" /> Download Image
                                            </Button>
                                        </a>
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-white/5 border border-white/10 rounded-3xl border-dashed">
                                        <ImageIcon size={48} className="text-slate-600 mb-4" />
                                        <h3 className="text-lg font-medium text-slate-300">Upload to generate Floorplan</h3>
                                        <p className="text-slate-500 text-sm mt-2">The AI will convert your sketch into a neat, professional floorplan.</p>
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
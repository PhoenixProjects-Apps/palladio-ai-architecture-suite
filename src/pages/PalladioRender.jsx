import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Upload, Loader2, Building2, Download, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import PalladioGate from '../components/PalladioGate';
import ImageLightbox from '../components/ImageLightbox';

export default function PalladioRender() {
    const [file, setFile] = useState(null);
    const [fileUrl, setFileUrl] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [style, setStyle] = useState('Photorealistic');
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [gallery, setGallery] = useState([]);
    const [lightboxUrl, setLightboxUrl] = useState(null);
    const fileInputRef = useRef(null);

    const styles = ['Photorealistic', 'Interior', 'Aerial View', 'Night Scene'];

    const handleFileSelect = async (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;
        setFile(selectedFile);
        if (selectedFile.type.startsWith('image/')) {
            setPreviewUrl(URL.createObjectURL(selectedFile));
        }

        setIsUploading(true);
        try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file: selectedFile });
            setFileUrl(file_url);
        } catch (err) {
            console.error(err);
        } finally {
            setIsUploading(false);
        }
    };

    const handleGenerate = async () => {
        if (!prompt && !fileUrl) return;
        setIsGenerating(true);
        try {
            const fullPrompt = `Create a ${style} architectural render. ${prompt} ${style === 'Night Scene' ? 'Night time, evening, illuminated.' : ''} ${style === 'Aerial View' ? "Bird's eye view, aerial perspective." : ''} ${style === 'Interior' ? 'Interior design, architectural interior, high quality materials.' : ''} ${style === 'Photorealistic' ? 'Highly detailed, photorealistic, architectural photography, 8k resolution.' : ''} Maintain exact structural forms if an image is provided.`;

            const params = { prompt: fullPrompt };
            if (fileUrl) {
                params.existing_image_urls = [fileUrl];
            }

            const response = await base44.integrations.Core.GenerateImage(params);
            
            if (response && response.url) {
                setGallery([{ url: response.url, style }, ...gallery]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <PalladioGate>
            <div className="min-h-screen bg-[#0f1117] text-white p-6 pb-24">
                <div className="max-w-4xl mx-auto">
                    <header className="flex items-center gap-4 mb-8 border-b border-white/10 pb-4">
                        <Link to={createPageUrl('Home')}>
                            <Button variant="ghost" size="icon" className="hover:bg-white/10 rounded-full">
                                <ArrowLeft size={20} />
                            </Button>
                        </Link>
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg">
                            <Building2 size={20} />
                        </div>
                        <h1 className="text-2xl font-bold">3D Renders</h1>
                    </header>

                    <div className="grid lg:grid-cols-2 gap-8 mb-8">
                        <div className="space-y-6">
                            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl space-y-6">
                                <div>
                                    <label className="text-sm font-medium text-slate-400 mb-2 block">1. Reference Image (Optional)</label>
                                    <div 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="border-2 border-dashed border-white/10 hover:border-amber-500/50 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-white/5"
                                    >
                                        {isUploading ? (
                                            <div className="flex flex-col items-center">
                                                <Loader2 size={24} className="animate-spin text-amber-500 mb-2" />
                                                <p className="text-slate-400 text-sm">Uploading...</p>
                                            </div>
                                        ) : previewUrl ? (
                                            <img src={previewUrl} alt="Preview" className="mx-auto max-h-[120px] rounded-xl object-contain shadow-lg" />
                                        ) : (
                                            <div className="flex flex-col items-center">
                                                <Upload size={24} className="text-slate-500 mb-2" />
                                                <p className="text-sm font-medium text-white">Upload sketch or 3D view</p>
                                                <p className="text-slate-500 text-xs mt-1">Image files only</p>
                                            </div>
                                        )}
                                        <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-slate-400 mb-2 block">2. Render Style</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {styles.map(s => (
                                            <button 
                                                key={s}
                                                onClick={() => setStyle(s)}
                                                className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-colors border ${style === s ? 'bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'}`}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-slate-400 mb-2 block">3. Design Description</label>
                                    <Textarea 
                                        value={prompt}
                                        onChange={e => setPrompt(e.target.value)}
                                        placeholder="Describe materials, lighting, surroundings (e.g. 'Modern concrete villa with large glass windows surrounded by pine trees...')"
                                        className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 min-h-[100px] rounded-xl"
                                    />
                                </div>

                                <Button 
                                    onClick={handleGenerate}
                                    disabled={(!prompt && !fileUrl) || isGenerating}
                                    className="w-full bg-amber-600 hover:bg-amber-700 text-white h-12 rounded-xl shadow-lg shadow-amber-500/20"
                                >
                                    {isGenerating ? <><Loader2 size={18} className="animate-spin mr-2" /> Generating Render...</> : "Generate Render"}
                                </Button>
                            </div>
                        </div>

                        <div>
                            <h2 className="text-lg font-semibold mb-4 text-slate-200">Gallery</h2>
                            {gallery.length === 0 ? (
                                <div className="h-[400px] flex flex-col items-center justify-center text-center p-8 bg-white/5 border border-white/10 rounded-3xl border-dashed">
                                    <ImageIcon size={48} className="text-slate-600 mb-4" />
                                    <h3 className="text-lg font-medium text-slate-300 mb-2">No renders yet</h3>
                                    <p className="text-slate-500 text-sm">Generate your first AI architectural render to see it here.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {gallery.map((item, idx) => (
                                        <div key={idx} className="relative group rounded-2xl overflow-hidden border border-white/10 aspect-[4/3] bg-slate-900 cursor-pointer" onClick={() => setLightboxUrl(item.url)}>
                                            <img src={item.url} alt="Generated render" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                                                <span className="text-xs font-medium text-amber-400 bg-black/50 px-2 py-1 rounded backdrop-blur-sm border border-amber-500/30">{item.style}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {lightboxUrl && <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
        </PalladioGate>
    );
}
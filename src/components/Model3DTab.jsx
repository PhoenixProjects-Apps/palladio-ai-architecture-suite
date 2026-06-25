import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, Download, Box } from 'lucide-react';
import { toast } from 'sonner';

export default function Model3DTab() {
    const [imageFile, setImageFile] = useState(null);
    const [imageUrl, setImageUrl] = useState(null);
    const [isConverting, setIsConverting] = useState(false);
    const [status, setStatus] = useState('');
    const [modelUrl, setModelUrl] = useState(null);
    const [savedModelUrl, setSavedModelUrl] = useState(null);
    const fileInputRef = useRef(null);
    const pollRef = useRef(null);

    useEffect(() => {
        const loadSaved = async () => {
            try {
                const user = await base44.auth.me();
                if (user?.model3d_url) setSavedModelUrl(user.model3d_url);
            } catch (e) { /* ignore */ }
        };
        loadSaved();
    }, []);

    useEffect(() => {
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, []);

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 20 * 1024 * 1024) {
            toast.error('Image must be under 20MB');
            return;
        }
        setImageFile(file);
        try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            setImageUrl(file_url);
        } catch (err) {
            console.error(err);
            toast.error('Failed to upload image');
        }
    };

    const startPolling = (id) => {
        let attempts = 0;
        const maxAttempts = 120;
        pollRef.current = setInterval(async () => {
            attempts++;
            try {
                const res = await base44.functions.invoke('tripo3dCheckStatus', { task_id: id });
                const data = res.data;
                if (data?.status === 'completed') {
                    clearInterval(pollRef.current);
                    if (data.modelUrl) {
                        setModelUrl(data.modelUrl);
                        setSavedModelUrl(data.modelUrl);
                        setStatus('');
                    }
                    setIsConverting(false);
                } else if (data?.status === 'failed' || data?.error) {
                    clearInterval(pollRef.current);
                    toast.error(data.error || '3D model generation failed');
                    setIsConverting(false);
                    setStatus('');
                } else {
                    setStatus(`Conversion in progress... (${data?.taskStatus || data?.status || 'processing'})`);
                }
            } catch (err) {
                console.error(err);
            }
            if (attempts >= maxAttempts) {
                clearInterval(pollRef.current);
                toast.error('Conversion timed out. Please try again later.');
                setIsConverting(false);
                setStatus('');
            }
        }, 5000);
    };

    const handleConvert = async () => {
        if (!imageUrl) return;
        setIsConverting(true);
        setStatus('Initiating conversion...');
        try {
            const res = await base44.functions.invoke('tripo3dConvert', { file_url: imageUrl });
            if (res.data?.error) {
                toast.error(res.data.error);
                setIsConverting(false);
                setStatus('');
                return;
            }
            const id = res.data?.taskId;
            if (!id) {
                toast.error('No task ID returned from Tripo3D');
                setIsConverting(false);
                setStatus('');
                return;
            }
            setStatus('Conversion in progress...');
            startPolling(id);
        } catch (err) {
            console.error(err);
            const errorMsg = err?.response?.data?.error || err?.message || 'Conversion failed to start';
            toast.error(errorMsg);
            setIsConverting(false);
            setStatus('');
        }
    };

    const handleDownload = () => {
        const url = modelUrl || savedModelUrl;
        if (!url) return;
        const a = document.createElement('a');
        a.href = url;
        a.download = 'floorplan-3d.glb';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const activeModel = modelUrl || savedModelUrl;

    return (
        <div className="grid lg:grid-cols-[360px_1fr] gap-8">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl space-y-6">
                <div>
                    <label className="text-sm font-medium text-slate-400 mb-3 block">Upload 2D floor plan image</label>
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-white/10 hover:border-violet-500/50 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-slate-900"
                    >
                        {imageFile ? (
                            <div className="flex flex-col items-center">
                                <img src={imageUrl} alt="preview" className="w-full rounded-lg mb-2 max-h-40 object-contain" />
                                <p className="text-white text-sm">{imageFile.name}</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center">
                                <Upload size={32} className="text-slate-500 mb-2" />
                                <p className="text-sm font-medium text-white">Click to upload image</p>
                                <p className="text-xs text-slate-500 mt-1">PNG, JPG up to 20MB</p>
                            </div>
                        )}
                        <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
                    </div>
                </div>
                <Button
                    onClick={handleConvert}
                    disabled={!imageUrl || isConverting}
                    className="w-full bg-violet-600 hover:bg-violet-700 text-white h-12 rounded-xl shadow-lg shadow-violet-500/20"
                >
                    {isConverting ? <><Loader2 size={18} className="animate-spin mr-2" /> Converting...</> : "Convert to 3D Model"}
                </Button>
                {status && <p className="text-sm text-slate-400 text-center">{status}</p>}
            </div>

            <div className="flex flex-col items-center">
                <div className="w-full bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-xl flex-1 min-h-[400px] flex items-center justify-center">
                    {activeModel ? (
                        <model-viewer
                            key={activeModel}
                            src={activeModel}
                            camera-controls
                            auto-rotate
                            shadow-intensity="1"
                            environment-image="neutral"
                            style={{ width: '100%', height: '500px', display: 'block', backgroundColor: '#3a3a5c' }}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center p-8">
                            <Box size={48} className="text-slate-600 mb-4" />
                            <h3 className="text-lg font-medium text-slate-300">No 3D model yet</h3>
                            <p className="text-slate-500 text-sm mt-2">Upload a 2D floor plan image and convert it to view a 3D model here.</p>
                        </div>
                    )}
                </div>
                {activeModel && (
                    <Button
                        onClick={handleDownload}
                        className="mt-4 bg-violet-600 hover:bg-violet-700 text-white h-12 px-8 rounded-xl shadow-lg shadow-violet-500/20"
                    >
                        <Download size={18} className="mr-2" /> Save 3D Model
                    </Button>
                )}
            </div>
        </div>
    );
}
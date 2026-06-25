import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, Box, Download } from 'lucide-react';
import { toast } from 'sonner';
import GlbViewer from './GlbViewer';

export default function Model3DTab() {
    const [imageFile, setImageFile] = useState(null);
    const [imageUrl, setImageUrl] = useState(null);
    const [isConverting, setIsConverting] = useState(false);
    const [status, setStatus] = useState('');
    const [taskId, setTaskId] = useState(null);
    const [modelUrl, setModelUrl] = useState(null);
    const fileInputRef = useRef(null);
    const pollRef = useRef(null);

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
        if (!id) {
            console.error('startPolling called with invalid id:', id);
            toast.error('Invalid task ID');
            setIsConverting(false);
            return;
        }
        let attempts = 0;
        const maxAttempts = 120;
        console.log('Starting polling with task_id:', id);
        pollRef.current = setInterval(async () => {
            attempts++;
            try {
                console.log('Polling attempt', attempts, 'with task_id:', id);
                const res = await base44.functions.invoke('hi3dCheckStatus', { task_id: id });
                const data = res.data;
                if (data?.status === 'completed') {
                    clearInterval(pollRef.current);
                    if (data.modelUrl) {
                        setModelUrl(data.modelUrl);
                        setStatus('');
                    }
                    setIsConverting(false);
                } else if (data?.status === 'failed' || data?.error) {
                    clearInterval(pollRef.current);
                    toast.error(data.error || '3D generation failed');
                    setIsConverting(false);
                    setStatus('');
                } else {
                    setStatus(`Processing... (${data?.state || 'processing'})`);
                }
            } catch (err) {
                console.error(err);
            }
            if (attempts >= maxAttempts) {
                clearInterval(pollRef.current);
                toast.error('Processing timed out. Please try again later.');
                setIsConverting(false);
                setStatus('');
            }
        }, 5000);
    };

    const handleConvert = async () => {
        if (!imageUrl) return;
        setIsConverting(true);
        setStatus('Creating 3D model...');
        try {
            const res = await base44.functions.invoke('hi3dConvert', { 
                file_url: imageUrl
            });
            if (res.data?.error) {
                toast.error(res.data.error);
                setIsConverting(false);
                setStatus('');
                return;
            }
            const id = res.data?.taskId;
            if (!id) {
                toast.error('No task ID returned from Hi3D');
                setIsConverting(false);
                setStatus('');
                return;
            }
            setTaskId(id);
            setStatus('Processing...');
            startPolling(id);
        } catch (err) {
            console.error(err);
            const errorMsg = err?.response?.data?.error || err?.message || 'Conversion failed to start';
            toast.error(errorMsg);
            setIsConverting(false);
            setStatus('');
        }
    };

    return (
        <div className="grid lg:grid-cols-[360px_1fr] gap-8">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl space-y-6">
                <div>
                    <label className="text-sm font-medium text-slate-400 mb-3 block">Upload image for 3D conversion</label>
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
                    {isConverting ? <><Loader2 size={18} className="animate-spin mr-2" /> Processing...</> : <><Box size={18} className="mr-2" /> Generate 3D Model</>}
                </Button>
                {status && <p className="text-sm text-slate-400 text-center">{status}</p>}
            </div>

            <div className="flex flex-col items-center">
                <div className="w-full bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-xl flex-1 min-h-[500px] flex items-center justify-center">
                    {modelUrl ? (
                        <div className="w-full h-full p-4">
                            <GlbViewer url={modelUrl} height="500px" />
                            <div className="flex gap-3 mt-4">
                                <a href={modelUrl} download="model-3d.glb" target="_blank" rel="noreferrer" className="flex-1">
                                    <Button className="w-full bg-white text-black hover:bg-slate-200 h-11 rounded-xl">
                                        <Download size={18} className="mr-2" /> Download 3D
                                    </Button>
                                </a>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center p-8">
                            <Box size={48} className="text-slate-600 mb-4" />
                            <h3 className="text-lg font-medium text-slate-300">No 3D model yet</h3>
                            <p className="text-slate-500 text-sm mt-2">Upload an image to generate a 3D model using Hi3D AI.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
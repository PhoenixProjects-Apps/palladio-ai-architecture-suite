import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Upload, Loader2, FileImage, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import ReactMarkdown from 'react-markdown';
import PalladioGate from '@/components/PalladioGate';
import { toast } from 'sonner';

export default function PalladioAssess() {
    const [file, setFile] = useState(null);
    const [fileUrl, setFileUrl] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState(null);
    const [uploadError, setUploadError] = useState(null);
    const fileInputRef = useRef(null);

    const handleFileSelect = async (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;
        setFile(selectedFile);
        setResult(null);
        setUploadError(null);

        if (selectedFile.type.startsWith('image/')) {
            setPreviewUrl(URL.createObjectURL(selectedFile));
        } else {
            setPreviewUrl(null);
        }

        setIsUploading(true);
        try {
            const res = await base44.integrations.Core.UploadFile({ file: selectedFile });
            setFileUrl(res.file_url || res.url);
        } catch (err) {
            console.error(err);
            let errMsg = "Failed to upload file. Please try again.";
            if (err?.message?.includes("Network Error")) {
                errMsg = "Network Error: The file might be too large or your connection was interrupted.";
            }
            setUploadError(errMsg);
            toast.error(errMsg);
        } finally {
            setIsUploading(false);
        }
    };

    const handleAnalyze = async () => {
        if (!file) return;
        if (!fileUrl) {
            toast.error("Please wait for the file to finish uploading or try uploading again.");
            return;
        }
        setIsAnalyzing(true);
        try {
            const prompt = `You are an expert architect. Analyze this uploaded architectural plan or drawing.
Please provide a detailed assessment covering:
1. Plan Type & Overview
2. Spatial Analysis
3. Design Observations
4. Compliance & Building Code Flags (General)
5. Recommendations

Format the response in Markdown. Use clear headings.`;
            
            const response = await base44.integrations.Core.InvokeLLM({
                prompt,
                file_urls: [fileUrl]
            });
            setResult(response);
        } catch (err) {
            setResult("An error occurred during analysis. Please try again.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <PalladioGate>
            <div className="min-h-screen bg-[#0f1117] text-white p-6">
                <div className="max-w-3xl mx-auto">
                    <header className="flex items-center gap-4 mb-8 border-b border-white/10 pb-4">
                        <Link to={createPageUrl('Home')}>
                            <Button variant="ghost" size="icon" className="hover:bg-white/10 rounded-full">
                                <ArrowLeft size={20} />
                            </Button>
                        </Link>
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-700 flex items-center justify-center shadow-lg">
                            <FileImage size={20} />
                        </div>
                        <h1 className="text-2xl font-bold">Assess Plans</h1>
                    </header>

                    {!result ? (
                        <div className="space-y-6">
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-white/10 hover:border-cyan-500/50 rounded-3xl p-12 text-center cursor-pointer transition-colors bg-white/5"
                            >
                                {isUploading ? (
                                    <div className="flex flex-col items-center">
                                        <Loader2 size={40} className="animate-spin text-cyan-500 mb-4" />
                                        <p className="text-slate-400">Uploading document...</p>
                                    </div>
                                ) : previewUrl ? (
                                    <img src={previewUrl} alt="Preview" className="mx-auto max-h-[300px] rounded-xl object-contain shadow-lg" />
                                ) : file ? (
                                    <div className="flex flex-col items-center">
                                        <FileImage size={48} className="text-cyan-500 mb-4" />
                                        <p className="text-white font-medium">{file.name}</p>
                                        <p className="text-slate-400 text-sm mt-1">PDF Document</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <Upload size={48} className="text-slate-500 mb-4" />
                                        <p className="text-lg font-medium text-white mb-2">Upload floorplans or drawings</p>
                                        <p className="text-slate-400 text-sm">Drag and drop, or click to browse (Images, PDF)</p>
                                    </div>
                                )}
                                <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,.pdf" className="hidden" />
                            </div>
                            
                            {uploadError && (
                                <div className="text-red-400 text-sm text-center bg-red-400/10 py-3 rounded-lg border border-red-400/20">
                                    <AlertCircle className="inline-block w-4 h-4 mr-2 mb-0.5" />
                                    {uploadError}
                                </div>
                            )}

                            <Button 
                                onClick={handleAnalyze} 
                                disabled={!file || isUploading || isAnalyzing}
                                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-6 text-lg rounded-xl shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isAnalyzing ? <><Loader2 size={20} className="animate-spin mr-2" /> Analysing Plan...</> : "Analyse Plan"}
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 prose prose-invert max-w-none prose-headings:text-cyan-400 prose-a:text-cyan-400 shadow-xl">
                                <ReactMarkdown>{result}</ReactMarkdown>
                            </div>
                            <Button 
                                onClick={() => { setResult(null); setFile(null); setFileUrl(null); setPreviewUrl(null); }}
                                variant="outline"
                                className="w-full border-white/20 text-white hover:bg-white/10 py-6 rounded-xl text-lg font-medium"
                            >
                                Analyse Another Plan
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </PalladioGate>
    );
}
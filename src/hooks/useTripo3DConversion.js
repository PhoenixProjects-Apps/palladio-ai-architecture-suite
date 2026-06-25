import { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export function useTripo3DConversion() {
    const [isConverting, setIsConverting] = useState(false);
    const [status, setStatus] = useState('');
    const [modelUrl, setModelUrl] = useState(null);
    const pollRef = useRef(null);

    useEffect(() => {
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, []);

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
                        setStatus('');
                    }
                    setIsConverting(false);
                } else if (data?.status === 'failed' || data?.error) {
                    clearInterval(pollRef.current);
                    toast.error(data.error || '3D model generation failed');
                    setIsConverting(false);
                    setStatus('');
                } else {
                    setStatus(`Generating 3D model... (${data?.taskStatus || data?.status || 'processing'})`);
                }
            } catch (err) {
                console.error(err);
            }
            if (attempts >= maxAttempts) {
                clearInterval(pollRef.current);
                toast.error('3D model generation timed out. Please try again later.');
                setIsConverting(false);
                setStatus('');
            }
        }, 5000);
    };

    const convert = async (imageUrl) => {
        if (!imageUrl || isConverting) return;
        if (pollRef.current) clearInterval(pollRef.current);
        setIsConverting(true);
        setStatus('Initiating 3D conversion...');
        setModelUrl(null);
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
            setStatus('Generating 3D model...');
            startPolling(id);
        } catch (err) {
            console.error(err);
            const errorMsg = err?.response?.data?.error || err?.message || '3D conversion failed to start';
            toast.error(errorMsg);
            setIsConverting(false);
            setStatus('');
        }
    };

    return { isConverting, status, modelUrl, convert };
}
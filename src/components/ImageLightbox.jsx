import React, { useEffect } from 'react';
import { X, Download, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function ImageLightbox({ url, onClose }) {
    useEffect(() => {
        const handleEsc = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    if (!url) return null;

    const handleCopy = async () => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            await navigator.clipboard.write([
                new ClipboardItem({ [blob.type]: blob })
            ]);
            toast.success('Image copied to clipboard');
        } catch (err) {
            toast.error('Failed to copy image');
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm">
            <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full" onClick={onClose}>
                <X size={24} />
            </Button>
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3">
                <Button onClick={handleCopy} className="bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md rounded-xl">
                    <Copy size={16} className="mr-2" /> Copy Image
                </Button>
                <a href={url} download="palladio-image.png" target="_blank" rel="noopener noreferrer">
                    <Button className="bg-white text-black hover:bg-slate-200 rounded-xl">
                        <Download size={16} className="mr-2" /> Download
                    </Button>
                </a>
            </div>
            <img src={url} alt="Expanded view" className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" />
        </div>
    );
}
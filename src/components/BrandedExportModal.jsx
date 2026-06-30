import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import html2canvas from 'html2canvas';
import { Loader2, Download, Upload } from 'lucide-react';

export default function BrandedExportModal({ generationId, imageUrl, triggerButton }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("Lot 42 - The Oakwood Residence");
  const [description, setDescription] = useState("3 Bed, 2 Bath, 2 Car Garage. Built by LuxeHomes.");
  const [accentColor, setAccentColor] = useState("#14213d");
  const [logoUrl, setLogoUrl] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setLogoUrl(file_url);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleExport = async () => {
    if (!canvasRef.current) return;
    setIsExporting(true);
    try {
      if (generationId) {
        await base44.entities.FloorplanGenerations.update(generationId, {
          listing_title: title,
          listing_description: description,
          accent_color: accentColor,
          company_logo_url: logoUrl
        });
      }

      const canvas = await html2canvas(canvasRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });
      
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement('a');
      link.download = 'branded-floorplan.png';
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button className="bg-cyan-600 hover:bg-cyan-700 text-white mt-4">
            Export with Branding
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-5xl bg-slate-900 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle>Export Branded Floorplan</DialogTitle>
        </DialogHeader>
        
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label>Listing Title</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} className="bg-slate-800 border-slate-700 mt-1 text-white" />
            </div>
            <div>
              <Label>Listing Description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} className="bg-slate-800 border-slate-700 mt-1 text-white" />
            </div>
            <div>
              <Label>Accent Color</Label>
              <div className="flex gap-2 mt-1">
                <Input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} className="w-12 h-10 p-1 bg-slate-800 border-slate-700" />
                <Input value={accentColor} onChange={e => setAccentColor(e.target.value)} className="flex-1 bg-slate-800 border-slate-700 text-white" />
              </div>
            </div>
            <div>
              <Label>Company Logo</Label>
              <div className="mt-2 flex items-center gap-4">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="h-12 object-contain bg-white/10 p-1 rounded" crossOrigin="anonymous" />
                ) : (
                  <div className="h-12 w-24 bg-slate-800 rounded flex items-center justify-center text-xs text-slate-400 border border-slate-700 border-dashed">No Logo</div>
                )}
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="text-slate-200 border-slate-700">
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                  Upload
                </Button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
              </div>
            </div>
            
            <Button className="w-full mt-4 bg-violet-600 hover:bg-violet-700 text-white" onClick={handleExport} disabled={isExporting}>
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
              Export High-Res Layout
            </Button>
          </div>

          <div className="overflow-auto bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-start justify-center max-h-[600px] w-full">
            <div style={{ transform: 'scale(0.35)', transformOrigin: 'top center', width: '1200px', height: '1080px', marginBottom: '-702px' }} className="bg-white shrink-0">
              <div ref={canvasRef} className="b44-marketing-canvas">
                <style>{`
                  .b44-marketing-canvas {
                    width: 1200px;
                    height: 1080px;
                    background: #ffffff;
                    padding: 40px;
                    box-sizing: border-box;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    border: 1px solid #e5e7eb;
                  }

                  .b44-canvas-floorplan-area {
                    width: 100%;
                    height: 840px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                  }

                  .b44-canvas-floorplan-area img {
                    max-width: 100%;
                    max-height: 100%;
                    object-fit: contain;
                  }

                  .b44-canvas-title-block {
                    width: 100%;
                    height: 120px;
                    padding-top: 24px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  }

                  .b44-title-block-meta h3 {
                    font-size: 20px;
                    font-weight: 700;
                    color: #111827;
                    margin: 0 0 6px 0;
                    text-transform: uppercase;
                    letter-spacing: 0.03em;
                  }

                  .b44-title-block-meta p {
                    font-size: 13px;
                    color: #6b7280;
                    margin: 0;
                    line-height: 1.4;
                    white-space: pre-line;
                  }

                  .b44-title-block-logo {
                    height: 64px;
                    display: flex;
                    align-items: center;
                  }

                  .b44-title-block-logo img {
                    max-height: 64px;
                    max-width: 240px;
                    object-fit: contain;
                  }

                  .logo-fallback-text {
                    font-size: 14px;
                    font-weight: 600;
                    letter-spacing: 0.1em;
                    color: #9ca3af;
                  }
                `}</style>
                <div className="b44-canvas-floorplan-area">
                  <img src={imageUrl} alt="Generated Floorplan Layout" crossOrigin="anonymous" />
                </div>
                
                <div className="b44-canvas-title-block" style={{ borderTop: `3px solid ${accentColor}` }}>
                  <div className="b44-title-block-meta">
                    <h3>{title}</h3>
                    <p>{description}</p>
                  </div>
                  
                  <div className="b44-title-block-logo">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Company Logo" crossOrigin="anonymous" />
                    ) : (
                      <span className="logo-fallback-text">REAL ESTATE STUDIO</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
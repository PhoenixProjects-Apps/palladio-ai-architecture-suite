import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { uploadToFirebase } from '@/lib/uploadHelper';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const isMobile = useIsMobile();

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const { file_url } = await uploadToFirebase(file);
      setLogoUrl(file_url);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleExport = async () => {
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

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 1200;
      canvas.height = 1080;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const loadImage = (src) => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error(`Failed to load asset: ${src}`));
          img.src = src;
        });
      };

      if (!imageUrl) {
        alert("No floorplan image asset found to export. Please generate the plan first.");
        setIsExporting(false);
        return;
      }
      
      const floorplanImg = await loadImage(imageUrl);

      const fitImageContain = (imgW, imgH, boxW, boxH) => {
        const scale = Math.min(boxW / imgW, boxH / imgH);
        const drawW = imgW * scale;
        const drawH = imgH * scale;
        const drawX = (boxW - drawW) / 2;
        const drawY = (boxH - drawH) / 2;
        return { drawW, drawH, drawX, drawY };
      };

      const boxX = 40;
      const boxY = 40;
      const boxW = canvas.width - 80;
      const footerHeight = 200;
      const boxH = canvas.height - footerHeight - 80;

      const fit = fitImageContain(floorplanImg.width, floorplanImg.height, boxW, boxH);
      ctx.drawImage(floorplanImg, boxX + fit.drawX, boxY + fit.drawY, fit.drawW, fit.drawH);

      const accent = accentColor || '#14213d'; 
      ctx.strokeStyle = accent;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(40, 920);
      ctx.lineTo(1160, 920);
      ctx.stroke();

      ctx.fillStyle = '#111827';
      ctx.font = 'bold 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const titleText = (title || "PROPOSED PROPERTY LAYOUT").toUpperCase();
      ctx.fillText(titleText, 40, 970, 750);

      ctx.fillStyle = '#4b5563';
      ctx.font = '22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const descriptionText = description || "Standard Property Specifications • Structural Layout Plan";
      const lines = descriptionText.split('\n');
      let lineY = 1010;
      lines.forEach((line) => {
        ctx.fillText(line, 40, lineY, 750);
        lineY += 32;
      });

      function drawTextLogoFallback(context) {
        context.fillStyle = '#9ca3af';
        context.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        context.textAlign = 'right';
        context.fillText('REAL ESTATE STUDIO', 1160, 1010);
        context.textAlign = 'left';
      }

      if (logoUrl) {
        try {
          const logoImg = await loadImage(logoUrl);
          const maxLogoW = 340;
          const maxLogoH = 120;
          let logoW = logoImg.width;
          let logoH = logoImg.height;
          const logoRatio = Math.min(maxLogoW / logoW, maxLogoH / logoH);

          logoW = logoW * logoRatio;
          logoH = logoH * logoRatio;
          const logoX = 1160 - logoW;
          const logoY = 920 + (160 - logoH) / 2;

          ctx.drawImage(logoImg, logoX, logoY, logoW, logoH);
        } catch (logoError) {
          console.warn("Logo failed", logoError);
          drawTextLogoFallback(ctx);
        }
      } else {
        drawTextLogoFallback(ctx);
      }

      const dataUrl = canvas.toDataURL('image/png', 1.0);
      const safeName = (title || 'floorplan').toLowerCase().replace(/[^a-z0-9]/g, '-');
      const link = document.createElement('a');
      link.download = `marketing-${safeName}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (err) {
      console.error(err);
      alert("An error occurred compiling the high-res layout file. Please try again.");
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
                <Input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} className="w-12 min-h-11 h-auto p-1 bg-slate-800 border-slate-700" />
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
                <input type="file" aria-label="Upload company logo" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
              </div>
            </div>
            
            <Button className="w-full mt-4 bg-violet-600 hover:bg-violet-700 text-white" onClick={handleExport} disabled={isExporting}>
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
              Export High-Res Layout
            </Button>
          </div>

          <style>{`
            :root { --export-scale: 0.35; }
            @media (max-width: 640px) {
              :root { --export-scale: 0.22; }
            }
          `}</style>
          {isMobile && <p className="text-slate-400 text-sm text-center py-8">Preview available on desktop. Click Export to generate the branded layout.</p>}
          {!isMobile && (
            <div className="overflow-x-auto bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-start justify-center max-h-[60vh] md:max-h-[600px] w-full max-w-full">
              <div style={{ transform: 'scale(var(--export-scale))', transformOrigin: 'top center', width: '1200px', height: '1080px', marginBottom: 'calc(-1080px * (1 - var(--export-scale)))' }} className="bg-white shrink-0">
                <div ref={canvasRef} className="b44-marketing-canvas">
                <style>{`
                  .b44-marketing-canvas {
                    width: 1200px;
                    height: 1080px;
                    background: #ffffff;
                    padding: 40px;
                    box-sizing: border-box;
                    display: grid;
                    grid-template-rows: minmax(0, 1fr) auto;
                    overflow: hidden;
                    border: 1px solid #e5e7eb;
                  }

                  .b44-canvas-floorplan-area {
                    min-height: 0;
                    overflow: hidden;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding-bottom: 40px;
                  }

                  .b44-canvas-floorplan-area img {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                  }

                  .b44-canvas-title-block {
                    flex-shrink: 0;
                    height: 200px;
                    padding-top: 28px;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  }

                  .b44-title-block-meta {
                    display: flex;
                    flex-direction: column;
                    justify-content: flex-start;
                    max-width: 70%;
                    overflow: hidden;
                  }

                  .b44-title-block-meta h3 {
                    font-size: 32px;
                    font-weight: 700;
                    color: #111827;
                    margin: 0 0 10px 0;
                    text-transform: uppercase;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                  }

                  .b44-title-block-meta p {
                    font-size: 22px;
                    color: #4b5563;
                    margin: 0;
                    line-height: 1.5;
                    white-space: pre-line;
                    overflow: hidden;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                  }

                  .b44-title-block-logo {
                    height: 120px;
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                    flex-shrink: 0;
                  }

                  .b44-title-block-logo img {
                    max-height: 120px;
                    max-width: 340px;
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
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
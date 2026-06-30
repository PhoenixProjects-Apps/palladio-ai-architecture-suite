import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, AlertCircle, Image as ImageIcon, Download, Box } from 'lucide-react';
import { toast } from 'sonner';

const PRESETS = [
  'Warm sunset lighting, photorealistic',
  'Scandinavian minimalist, soft daylight',
  'Luxury real estate photography, evening',
  'Tropical resort style, lush greenery'
];

export default function Floorplan3DRenderer({ floorplanImage, onRequireFloorplan }) {
  const [prompt, setPrompt] = useState('');
  const [isRendering, setIsRendering] = useState(false);
  const [renderResult, setRenderResult] = useState(null);

  const handleRender = async () => {
    if (!floorplanImage) {
      toast.error('Generate a floorplan first.');
      return;
    }
    setIsRendering(true);
    try {
      const tokenRes = await base44.functions.invoke('consumeToken', { amount: 5 });
      if (tokenRes.data?.error) {
        toast.error("You don't have enough AI tokens. Rendering requires 5 tokens. Please upgrade your plan.");
        setIsRendering(false);
        return;
      }
      const fullPrompt = `3D architectural floorplan render, bird's eye view, top-down isometric 3D visualization, photorealistic materials and lighting, detailed roof cutaway showing furnished rooms. ${prompt}. Keep the exact room layout and proportions from the reference floorplan. Enhance the 'Photorealistic' texture parameters. Ensure the engine explicitly separates material assignments for a clean real estate look: Flooring: Light oak hardwood planks with subtle matte reflection. Kitchen/Bath Surfaces: Polished white quartz or Carrara marble. Walls: Clean matte white architectural paint. Fixtures: Modern brushed steel and transparent clear glass. Avoid: Plastic-looking surfaces, dark heavy mud textures, over-saturated colors, and deep unrealistic shadows.`;
      const res = await base44.integrations.Core.GenerateImage({
        prompt: fullPrompt,
        existing_image_urls: [floorplanImage]
      });
      setRenderResult(res.url);
    } catch (err) {
      console.error(err);
      toast.error('Render failed. Please try again.');
    } finally {
      setIsRendering(false);
    }
  };

  if (!floorplanImage) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-white/5 border border-white/10 rounded-3xl border-dashed">
        <AlertCircle size={48} className="text-slate-600 mb-4" />
        <h3 className="text-lg font-medium text-slate-300">No floorplan to render</h3>
        <p className="text-slate-500 text-sm mt-2 max-w-md mb-6">Generate a floorplan from a text description first — the 3D renderer uses that layout.</p>
        <Button onClick={onRequireFloorplan} className="bg-violet-600 hover:bg-violet-700 text-white h-11 rounded-xl">
          <Box size={18} className="mr-2" /> Go to Floorplan Generator
        </Button>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-[360px_1fr] gap-8">
      {/* Prompt + render controls */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl space-y-6">
        <div>
          <label className="text-sm font-medium text-slate-400 mb-3 block">Render prompt</label>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="E.g., warm sunset lighting, photorealistic, landscaped garden surroundings..."
            className="bg-slate-900 border-slate-700 text-white min-h-[110px] rounded-xl mb-3"
          />
          <div className="flex flex-wrap gap-2 mb-4">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setPrompt(p)}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-full transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
          <Button
            onClick={handleRender}
            disabled={isRendering}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white h-12 rounded-xl shadow-lg shadow-violet-500/20"
          >
            {isRendering ? <><Loader2 size={18} className="animate-spin mr-2" /> Rendering...</> : <><Sparkles size={18} className="mr-2" /> Render 3D Floorplan</>}
          </Button>
          <p className="text-xs text-slate-500 mt-2 text-center">Uses 5 AI tokens per render</p>
        </div>
      </div>

      {/* Render result */}
      <div className="flex flex-col min-w-0">
        <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-xl flex-1 min-h-[460px] flex items-center justify-center p-4">
          {renderResult ? (
            <div className="w-full space-y-4 animate-in fade-in duration-500">
              <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-lg">
                <img src={renderResult} alt="3D floorplan render" className="w-full h-auto" />
              </div>
              <a href={renderResult} download="3d-floorplan-render.png" target="_blank" rel="noreferrer">
                <Button className="w-full bg-white text-black hover:bg-slate-200 h-11 rounded-xl">
                  <Download size={18} className="mr-2" /> Download Render
                </Button>
              </a>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-6">
              <ImageIcon size={40} className="text-slate-600 mb-3" />
              <h3 className="text-lg font-medium text-slate-300">No render yet</h3>
              <p className="text-slate-500 text-sm mt-2 max-w-sm">Enter a prompt and click "Render 3D Floorplan" to generate a bird's-eye 3D visualization of your floorplan.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
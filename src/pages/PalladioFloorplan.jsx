import React, { useState, useRef, useEffect, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { Layers, Loader2, Upload, Box, Download, Image as ImageIcon } from 'lucide-react';
import BackButton from '@/components/BackButton';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import PalladioGate from '../components/PalladioGate';
import SaveToProject from '../components/SaveToProject';
import ChooseProject from '../components/ChooseProject';
import { toast } from 'sonner';
import { uploadToFirebase, validateUpload } from '@/lib/uploadHelper';

const ReactMarkdown = React.lazy(() => import('react-markdown'));
const BrandedExportModal = React.lazy(() => import('../components/BrandedExportModal'));

function extractJson(text) {
  if (!text) return null;
  let s = String(text).trim().replace(/```json/gi, '').replace(/```/g, '').trim();
  try { return JSON.parse(s); } catch (_) {}
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    try { return JSON.parse(s.slice(start, end + 1)); } catch (_) {}
  }
  return null;
}

const ms = (start) => Math.round(performance.now() - start);

const buildFloorplanImagePrompt = (description, style, shape) => `High-end 2D architectural floor plan blueprint for: "${description}". Footprint shape: ${shape}. Architectural aesthetic: ${style}. Clean crisp vector linework, solid dark navy walls, pure white background, top-down view, metric room labels and dimensions, door swings, window openings, minimal tasteful furniture symbols, professional real-estate layout. Do NOT include borders, frames, logos, title blocks, watermarks, 3D elements, sketch texture, grid lines, external text blocks, signatures, stamps, or text around image edges.`;

const saveFloorplanHistory = (payload, timings, totalStart) => {
  const saveStart = performance.now();
  void base44.entities.FloorplanGenerations.create(payload)
    .then(() => {
      timings.history_save_ms = ms(saveStart);
    })
    .catch((saveErr) => {
      timings.history_save_ms = ms(saveStart);
      timings.history_save_failed = true;
      console.error("Failed to save FloorplanGenerations:", saveErr);
      toast.warning("Floorplan generated, but failed to save to history.");
    })
    .finally(() => {
      timings.total_generation_ms = ms(totalStart);
      console.info('[PalladioPerf]', timings);
    });
};

const SHAPES = ['Any Shape', 'Square', 'Rectangle', 'L-Shape', 'U-Shape'];

const AUSTRALIAN_LAYOUTS = {
  "Custom": null,
  "1 Bed, 1 Bath, Granny Flat": {
    target_area_sqm: "50 - 60",
    zones: {
      public_living: ["Open Plan Kitchenette", "Living/Meals Area"],
      private_sleeping: ["Bedroom 1 (Built-in Robe)"],
      service_wet: ["Combined Bathroom/Laundry"]
    },
    adjacency_rules: ["Living area serves as central circulation.", "Bathroom accessible from living space, not just ensuite, for guests."]
  },
  "2 Bed, 1 Bath, Granny Flat": {
    target_area_sqm: "60 - 70",
    zones: {
      public_living: ["Kitchen", "Living/Meals Area"],
      private_sleeping: ["Bedroom 1", "Bedroom 2"],
      service_wet: ["Bathroom", "European Laundry"]
    },
    adjacency_rules: ["Bedrooms located away from main entry.", "European laundry integrated into hallway or kitchen to save space."]
  },
  "3 Bed, 2 Bath, 1 Car Family Home": {
    target_area_sqm: "150 - 170",
    zones: {
      public_living: ["Kitchen", "Walk-in Pantry", "Open Dining", "Family Room", "Alfresco"],
      private_sleeping: ["Master Bedroom (WIR, Ensuite)", "Bedroom 2", "Bedroom 3"],
      service_wet: ["Main Bathroom", "Separate WC", "Laundry", "Single Garage"]
    },
    adjacency_rules: ["Master suite located at front or deep rear for privacy.", "Main bathroom and separate WC clustered near secondary bedrooms."]
  },
  "4 Bed, 2 Bath, 2 Car, Family Home": {
    target_area_sqm: "200 - 220",
    zones: {
      public_living: ["Open Plan Kitchen", "Walk-in Pantry", "Dining", "Family/Living", "Covered Alfresco"],
      private_sleeping: ["Master Suite (WIR, Ensuite)", "Bedroom 2", "Bedroom 3", "Bedroom 4"],
      service_wet: ["Main Bathroom (Tub + Shower)", "Separate WC", "Laundry", "Double Garage"]
    },
    adjacency_rules: ["Bedrooms 2, 3, and 4 clustered in a dedicated kids wing around the main bathroom.", "Alfresco directly accessible from Family/Dining."]
  },
  "4 Bed, 2 Bath, 2 Car + Media & Study": {
    target_area_sqm: "250 - 270",
    zones: {
      public_living: ["Gourmet Kitchen", "Butler's Pantry", "Dining", "Spacious Family", "Media Room", "Grand Alfresco"],
      private_sleeping: ["Master Retreat", "Bedroom 2", "Bedroom 3", "Bedroom 4", "Study/Home Office"],
      service_wet: ["Main Bathroom", "Powder Room", "Dedicated Laundry", "Double Garage"]
    },
    adjacency_rules: ["Powder room easily accessible from public living areas.", "Butler's pantry connects kitchen to garage/laundry access.", "Media room separated from bedrooms."]
  },
  "5 Bed, 2.5 Bath, 2 Car, Luxury Home": {
    target_area_sqm: "300+",
    zones: {
      public_living: ["Kitchen", "Butler's Pantry", "Formal Dining", "Open Living", "Media Room", "Rumpus", "Oversized Alfresco"],
      private_sleeping: ["Master Retreat", "Guest Bedroom", "Bedroom 2", "Bedroom 3", "Bedroom 4", "Study"],
      service_wet: ["Master Ensuite", "Main Bathroom", "Guest Powder Room", "Mudroom", "Large Laundry", "Double Garage"]
    },
    adjacency_rules: ["Kids bedrooms clustered around Rumpus room.", "Guest bedroom located away from family bedrooms.", "Mudroom acts as transition from Garage to hallway."]
  }
};

export default function PalladioFloorplan() {
  const [tab, setTab] = useState(() => sessionStorage.getItem('pf-tab') || 'text');
  const [selectedProject, setSelectedProject] = useState(null);

  const [style, setStyle] = useState(() => sessionStorage.getItem('pf-style') || 'Modern');
  const [selectedShape, setSelectedShape] = useState('Any Shape');
  const [selectedLayoutPreset, setSelectedLayoutPreset] = useState('Custom');
  
  const ARCH_STYLES = ['Modern', 'Minimalist', 'Industrial', 'Heritage', 'Contemporary', 'Scandinavian', 'Coastal', 'Mid-Century'];

  // Tab 1 state
  const [desc, setDesc] = useState(() => sessionStorage.getItem('pf-desc') || '');
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [textResult, setTextResult] = useState({ layout: null, image: null, layoutData: null });
  
  useEffect(() => {
    sessionStorage.setItem('pf-tab', tab);
    sessionStorage.setItem('pf-style', style);
  }, [tab, style]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      sessionStorage.setItem('pf-desc', desc);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [desc]);

  // Tab 2 state
  const [cadFile, setCadFile] = useState(null);
  const [cadFileUrl, setCadFileUrl] = useState(null);
  const [isGeneratingSketch, setIsGeneratingSketch] = useState(false);
  const [sketchResult, setSketchResult] = useState(null);
  const fileInputRef = useRef(null);

  const handleTextGenerate = async () => {
    if (!desc && selectedLayoutPreset === 'Custom') return;
    const totalStart = performance.now();
    const timings = { feature: 'floorplan_text' };
    setIsGeneratingText(true);
    setTextResult({ layout: null, image: null, layoutData: null });
    try {
      const tokenStart = performance.now();
      const tokenRes = await base44.functions.invoke('consumeToken', { amount: 5 });
      timings.token_check_ms = ms(tokenStart);
      if (tokenRes.data?.error) {
        toast.error("You don't have enough AI tokens. Floorplan generation requires 5 tokens. Please upgrade your plan.");
        setIsGeneratingText(false);
        timings.total_generation_ms = ms(totalStart);
        console.info('[PalladioPerf]', timings);
        return;
      }
      
      const presetRules = selectedLayoutPreset && AUSTRALIAN_LAYOUTS[selectedLayoutPreset]
        ? JSON.stringify(AUSTRALIAN_LAYOUTS[selectedLayoutPreset], null, 2)
        : "No strict zoning preset provided. Rely on user description.";

      const llmPrompt = `Act as an architect and real estate marketing expert. Create a detailed layout brief for: "${desc}". The architectural style is ${style}.
      
      MANDATORY CONSTRAINTS:
      Footprint Shape Preference: ${selectedShape}
      Structural Zones & Adjacency Rules: ${presetRules}
      
      You must return a structured JSON response matching the required schema based on these constraints.
      The 'image_prompt' must be a highly detailed prompt for an image generator (like Midjourney/DALL-E) to create a top-down 2D architectural floor plan blueprint. Include instructions for crisp black/dark navy linework, white or warm off-white background, metric room dimensions, door swings, window openings, and minimal tasteful furniture symbols. EXPLICITLY state what NOT to include: borders, frames, logos, title blocks, 3D elements, sketch textures, grid lines, or any external text blocks in the generated raw image, because branding is handled separately.
      Ensure the layout_markdown provides a readable brief of the design, and 'rooms' outlines the spaces with name, type, width, depth, x, and z coordinates.`;

      const schema = {
        type: "object",
        properties: {
          layout_markdown: { type: "string" },
          image_prompt: { type: "string" },
          rooms: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                type: { type: "string" },
                width: { type: "number" },
                depth: { type: "number" },
                x: { type: "number" },
                z: { type: "number" }
              },
              required: ["name", "type", "width", "depth", "x", "z"]
            }
          },
          design_notes: { type: "string" }
        },
        required: ["layout_markdown", "image_prompt", "rooms"]
      };

      const llmStart = performance.now();
      const specPromise = base44.integrations.Core.InvokeLLM({
        prompt: llmPrompt,
        response_json_schema: schema
      }).then((spec) => {
        timings.llm_layout_ms = ms(llmStart);
        return spec;
      });

      const imageStart = performance.now();
      const imagePromise = base44.integrations.Core.GenerateImage({
        prompt: buildFloorplanImagePrompt(desc, style, selectedShape)
      }).then((imageRes) => {
        timings.image_generation_ms = ms(imageStart);
        if (!imageRes?.url) throw new Error("Failed to generate floorplan image.");
        setTextResult((current) => ({ ...current, image: imageRes.url }));
        setIsGeneratingText(false);
        return imageRes;
      });

      const [specSettled, imageSettled] = await Promise.allSettled([specPromise, imagePromise]);
      const spec = specSettled.status === 'fulfilled' ? specSettled.value : null;
      const imageRes = imageSettled.status === 'fulfilled' ? imageSettled.value : null;

      if (!spec && !imageRes) {
        throw new Error("Failed to generate floorplan specification and image.");
      }

      if (spec) {
        setTextResult((current) => ({
          layout: spec.layout_markdown || '',
          image: current.image || imageRes?.url || null,
          layoutData: { rooms: spec.rooms || [] }
        }));
      } else if (imageRes) {
        timings.llm_layout_failed = true;
        toast.warning("Floorplan image generated, but structured room data was not generated.");
      }

      if (!imageRes && spec) {
        timings.image_generation_failed = true;
        toast.warning("Layout brief generated, but the floorplan image failed. Please try generating again.");
        setIsGeneratingText(false);
      }

      saveFloorplanHistory({
        project_name: selectedLayoutPreset !== 'Custom' ? selectedLayoutPreset : "Floorplan Generate",
        raw_layout_data: { rooms: spec?.rooms || [] },
        ui_style_selection: 'Top-Down',
        ui_finish_selection: 'Photorealistic',
        ui_layout_selection: 'Standard 3D',
        footprint_shape: selectedShape, // Now saving the shape configuration to history
        status: 'Completed',
        output_image_url: imageRes?.url,
        accent_color: '#1e293b',
        branded_border_enabled: false
      }, timings, totalStart);
    } catch (err) {
      console.error(err);
      toast.error('Generation failed. Please try again.');
      timings.total_generation_ms = ms(totalStart);
      console.info('[PalladioPerf]', timings);
      setIsGeneratingText(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const vErr = validateUpload(file, ['image/', 'application/pdf'], 25);
    if (vErr) {
      toast.error(vErr);
      e.target.value = '';
      return;
    }

    setCadFile(file);
    try {
      const uploadStart = performance.now();
      const { file_url } = await uploadToFirebase(file);
      console.info('[PalladioPerf]', { feature: 'floorplan_sketch_upload', upload_ms: ms(uploadStart) });
      setCadFileUrl(file_url);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSketchGenerate = async () => {
    if (!cadFileUrl) return;
    const totalStart = performance.now();
    const timings = { feature: 'floorplan_sketch' };
    setIsGeneratingSketch(true);
    try {
      const tokenStart = performance.now();
      const tokenRes = await base44.functions.invoke('consumeToken', { amount: 5 });
      timings.token_check_ms = ms(tokenStart);
      if (tokenRes.data?.error) {
        toast.error("You don't have enough AI tokens. Floorplan generation requires 5 tokens. Please upgrade your plan.");
        setIsGeneratingSketch(false);
        timings.total_generation_ms = ms(totalStart);
        console.info('[PalladioPerf]', timings);
        return;
      }
      const imagePrompt = `High-end 2D architectural floor plan blueprint, clean crisp vector lines, solid dark navy blue walls, pure white background, minimal vector furniture symbols, clean modern sans-serif typography, crisp METRIC room dimensions (e.g. 5m x 4m), professional real estate layout. A neat, professional, 2D architectural floorplan with dimensions and furniture, top-down view, high quality. The layout should match the provided sketch perfectly. Architectural aesthetic: ${style}. Do NOT include: Borders, frames, margin lines, framing rectangles around the image, Imperial measurements, feet, inches, Photorealistic textures, 3D elements, hand-drawn lines, sketch textures, shadows, gradients, colored floors, messy icons, grid lines, architectural hatching patterns, dark backgrounds, blurry text, title, heading, date, project name, designer name, watermark, logos, stamps, signatures, or any text blocks outside the drawing — absolutely no text, lines, or watermarks at the bottom/edges, only the floorplan itself floating on a pure white background with clear room labels in metric.`;

      const imageStart = performance.now();
      const imageRes = await base44.integrations.Core.GenerateImage({
        prompt: imagePrompt,
        existing_image_urls: [cadFileUrl]
      });
      timings.image_generation_ms = ms(imageStart);

      if (!imageRes || !imageRes.url) {
        throw new Error("Failed to generate floorplan image.");
      }

      setSketchResult(imageRes.url);
      setIsGeneratingSketch(false);

      saveFloorplanHistory({
        project_name: "Floorplan Sketch Generate",
        raw_layout_data: { imageUrl: imageRes.url },
        ui_style_selection: 'Top-Down',
        ui_finish_selection: 'Photorealistic',
        ui_layout_selection: 'Standard 3D',
        status: 'Completed',
        output_image_url: imageRes.url,
        accent_color: '#1e293b',
        branded_border_enabled: false
      }, timings, totalStart);
    } catch (err) {
      console.error(err);
      toast.error('Generation failed. Please try again.');
      timings.total_generation_ms = ms(totalStart);
      console.info('[PalladioPerf]', timings);
      setIsGeneratingSketch(false);
    }
  };

  return (
    <PalladioGate>
            <div className="min-h-screen bg-[#0f1117] text-white p-4 sm:p-6 pb-12 sm:pb-24 overflow-x-hidden">
                <div className="max-w-5xl mx-auto">
                    <header className="flex flex-wrap items-center gap-3 sm:gap-4 mb-8 border-b border-white/10 pb-4 min-w-0">
                        <BackButton aria-label="Go Back" className="hover:bg-white/10 rounded-full shrink-0" />
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-lg shrink-0">
                            <Layers size={20} />
                        </div>
                        <h1 className="font-bold text-lg sm:text-xl flex-1 min-w-0 whitespace-nowrap overflow-hidden text-ellipsis">Floorplans</h1>
                        <div className="ml-auto shrink-0">
                            <ChooseProject
                                selected={selectedProject}
                                onSelect={setSelectedProject}
                                className="border-violet-500/50 text-violet-300 hover:bg-violet-500/10"
                            />
                        </div>
                    </header>

                    {/* Tabs */}
                    <div className="flex flex-col md:flex-row gap-1 bg-slate-900 rounded-xl p-1 mb-8 w-full sm:w-max">
                        <button
              onClick={() => setTab('text')}
              className={`min-h-11 w-full sm:w-auto px-4 sm:px-6 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'text' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
                            Generate from Text
                        </button>
                        <button
              onClick={() => setTab('sketch')}
              className={`min-h-11 w-full sm:w-auto px-4 sm:px-6 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'sketch' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
                            Sketch to Floorplan
                        </button>
                        <Link
              to="/Floorplan3D" state={{ layoutData: textResult?.layoutData || (sketchResult ? { imageUrl: sketchResult } : null), sourceImage: textResult?.image || sketchResult }}
              className={`min-h-11 w-full sm:w-auto px-4 sm:px-6 py-2 rounded-lg text-sm font-medium transition-all text-slate-400 hover:text-white flex items-center justify-center`}>
                            3D Floorplan Renderer
                        </Link>
                    </div>

                    {tab === 'text' &&
          <div className="grid lg:grid-cols-2 gap-8">
                            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl space-y-6">
                                <div>
                                    
                                    {/* Added UI Controls for Shape and Layout */}
                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div>
                                            <label className="text-sm font-medium text-slate-400 mb-3 block">Architectural Style</label>
                                            <Select value={style} onValueChange={setStyle}>
                                                <SelectTrigger className="bg-slate-900 border-slate-700 text-white w-full rounded-xl h-11">
                                                    <SelectValue placeholder="Select style..." />
                                                </SelectTrigger>
                                                <SelectContent className="bg-slate-900 border-slate-700">
                                                    {ARCH_STYLES.map((s) =>
                          <SelectItem key={s} value={s} className="text-white cursor-pointer">{s}</SelectItem>
                          )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-slate-400 mb-3 block">Base Shape</label>
                                            <Select value={selectedShape} onValueChange={setSelectedShape}>
                                                <SelectTrigger className="bg-slate-900 border-slate-700 text-white w-full rounded-xl h-11">
                                                    <SelectValue placeholder="Select shape..." />
                                                </SelectTrigger>
                                                <SelectContent className="bg-slate-900 border-slate-700">
                                                    {SHAPES.map((s) =>
                          <SelectItem key={s} value={s} className="text-white cursor-pointer">{s}</SelectItem>
                          )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    
                                    <div className="mb-6">
                                        <label className="text-sm font-medium text-slate-400 mb-3 block">Australian Standard Layouts</label>
                                        <Select value={selectedLayoutPreset} onValueChange={setSelectedLayoutPreset}>
                                            <SelectTrigger className="bg-slate-900 border-slate-700 text-white w-full rounded-xl h-11">
                                                <SelectValue placeholder="Select layout preset..." />
                                            </SelectTrigger>
                                            <SelectContent className="bg-slate-900 border-slate-700">
                                                {Object.keys(AUSTRALIAN_LAYOUTS).map((presetKey) =>
                                                  <SelectItem key={presetKey} value={presetKey} className="text-white cursor-pointer">{presetKey}</SelectItem>
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <label htmlFor="floorplan-description" className="text-sm font-medium text-slate-400 mb-3 block">Describe your space {selectedLayoutPreset !== 'Custom' && "(Optional)"}</label>
                                    <Textarea
                                      id="floorplan-description"
                                      value={desc}
                                      onChange={(e) => setDesc(e.target.value)}
                                      placeholder={selectedLayoutPreset !== 'Custom' ? "Add extra custom details to the selected layout preset..." : "E.g., A 3 bedroom, 2 bathroom family home with an open plan kitchen/living area..."}
                                      className="bg-slate-900 border-slate-700 text-white min-h-[120px] rounded-xl mb-3" />
                                </div>
                                <Button
                                  onClick={handleTextGenerate}
                                  disabled={(!desc && selectedLayoutPreset === 'Custom') || isGeneratingText}
                                  aria-busy={isGeneratingText}
                                  className="w-full bg-violet-600 hover:bg-violet-700 text-white h-12 rounded-xl shadow-lg shadow-violet-500/20">
                                    {isGeneratingText ? <><Loader2 size={18} className="animate-spin mr-2" /> Generating...</> : "Generate Floorplan"}
                                </Button>
                            </div>

                            <div>
                                {textResult.image || textResult.layout ?
              <div className="space-y-6 animate-in fade-in duration-500">
                                        {textResult.image &&
                <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-lg">
                                                <img loading="lazy" decoding="async" src={textResult.image} alt="Generated floorplan" className="w-full h-auto" />
                                            </div>
                }
                                        <div className="flex flex-col md:flex-row gap-3">
                                            {textResult.image &&
                                            <Suspense fallback={null}>
                                              <BrandedExportModal
                                                imageUrl={textResult.image}
                                                triggerButton={
                                                  <Button className="w-full md:flex-1 bg-white text-black hover:bg-slate-200 h-12 rounded-xl shadow-lg">
                                                    <Download size={18} className="mr-2" /> Export Branded
                                                  </Button>
                                                }
                                              />
                                            </Suspense>
                                            }
                                            <Link to="/Floorplan3D" state={{ layoutData: textResult?.layoutData, sourceImage: textResult?.image }} className="w-full md:flex-1">
                                              <Button
                      className="w-full bg-cyan-600 hover:bg-cyan-700 text-white h-12 rounded-xl shadow-lg shadow-cyan-500/20">
                      
                                                  <Box size={18} className="mr-2" /> 3D Floorplan Renderer
                                              </Button>
                                            </Link>
                                            {textResult.image &&
                                            <SaveToProject
                    fileUrl={textResult.image}
                    fileName="floorplan.png"
                    assetType="plan"
                    projectId={selectedProject?.id}
                    className="w-full md:flex-1 h-12 rounded-xl border-violet-500/50 text-violet-300 hover:bg-violet-500/10" />
                                            }
                  
                                        </div>

                                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 prose prose-invert max-w-none break-words text-sm">
                                            <h3 className="text-violet-400 mt-0">Layout Brief</h3>
                                            {textResult.layout ?
                                              <Suspense fallback={<p className="text-slate-400">Loading layout brief...</p>}>
                                                <ReactMarkdown>{textResult.layout}</ReactMarkdown>
                                              </Suspense> :
                                              <p className="text-slate-400">Structured room data is still being generated...</p>
                                            }
                                        </div>
                                    </div> :

              <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-white/5 border border-white/10 rounded-3xl border-dashed">
                                        <Layers size={48} className="text-slate-600 mb-4" />
                                        <h3 className="text-lg font-medium text-slate-300">No floorplan generated</h3>
                                        <p className="text-slate-500 text-sm mt-2">Describe your requirements to generate a plan and 3D model.</p>
                                    </div>
              }
                            </div>
                        </div>
          }

                    {tab === 'sketch' &&
          <div className="grid lg:grid-cols-2 gap-8">
                            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl space-y-6">
                                <div>
                                    <div className="mb-6">
                                        <label className="text-sm font-medium text-slate-400 mb-3 block">Architectural Style</label>
                                        <Select value={style} onValueChange={setStyle}>
                                            <SelectTrigger className="bg-slate-900 border-slate-700 text-white w-full rounded-xl h-11">
                                                <SelectValue placeholder="Select style..." />
                                            </SelectTrigger>
                                            <SelectContent className="bg-slate-900 border-slate-700">
                                                {ARCH_STYLES.map((s) =>
                      <SelectItem key={s} value={s} className="text-white cursor-pointer">{s}</SelectItem>
                      )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <label className="text-sm font-medium text-slate-400 mb-3 block">Upload existing floorplan sketch</label>
                                    <div
                  role="button"
                  tabIndex={0}
                  aria-label="Upload existing floorplan sketch"
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
                  className="border-2 border-dashed border-white/10 hover:border-violet-500/50 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-slate-900 mb-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
                  
                                        {cadFile ?
                  <div className="flex flex-col items-center">
                                                <ImageIcon size={32} className="text-violet-500 mb-2" />
                                                <p className="text-white text-sm max-w-full break-all px-2">{cadFile.name}</p>
                                            </div> :

                  <div className="flex flex-col items-center">
                                                <Upload size={32} className="text-slate-500 mb-2" />
                                                <p className="text-sm font-medium text-white">Click or drag image here</p>
                                            </div>
                  }
                                        <input type="file" aria-label="Upload sketch or base plan" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
                                    </div>
                                </div>
                                <Button
                onClick={handleSketchGenerate}
                disabled={!cadFileUrl || isGeneratingSketch}
                aria-busy={isGeneratingSketch}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white h-12 rounded-xl shadow-lg shadow-violet-500/20">
                
                                    {isGeneratingSketch ? <><Loader2 size={18} className="animate-spin mr-2" /> Generating...</> : "Generate Professional Floorplan"}
                                </Button>
                            </div>

                            <div>
                                {sketchResult ?
              <div className="space-y-6 animate-in fade-in duration-500">
                                        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-lg p-4">
                                            <img loading="lazy" decoding="async" src={sketchResult} alt="Generated Floorplan" className="w-full rounded-lg" />
                                        </div>
                                        <Link to="/Floorplan3D" state={{ layoutData: { imageUrl: sketchResult }, sourceImage: sketchResult }} className="w-full">
                                          <Button
                                          className="w-full bg-cyan-600 hover:bg-cyan-700 text-white h-12 rounded-xl shadow-lg shadow-cyan-500/20">

                                                  <Box size={18} className="mr-2" /> 3D Floorplan Renderer
                                              </Button>
                                        </Link>
                                        <div className="flex flex-col md:flex-row gap-3">
                                            <Suspense fallback={null}>
                                              <BrandedExportModal
                                                imageUrl={sketchResult}
                                                triggerButton={
                                                  <Button className="w-full md:flex-1 bg-white text-black hover:bg-slate-200 h-12 rounded-xl shadow-lg">
                                                    <Download size={18} className="mr-2" /> Export Branded
                                                  </Button>
                                                }
                                              />
                                            </Suspense>
                                            <SaveToProject
                    fileUrl={sketchResult}
                    fileName="floorplan-sketch.png"
                    assetType="plan"
                    projectId={selectedProject?.id}
                    className="w-full md:flex-1 h-12 rounded-xl border-violet-500/50 text-violet-300 hover:bg-violet-500/10" />
                  
                                        </div>
                                    </div> :

              <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-white/5 border border-white/10 rounded-3xl border-dashed">
                                        <ImageIcon size={48} className="text-slate-600 mb-4" />
                                        <h3 className="text-lg font-medium text-slate-300">Upload to generate Floorplan</h3>
                                        <p className="text-slate-500 text-sm mt-2">The AI will convert your sketch into a neat, professional floorplan.</p>
                                    </div>
              }
                            </div>
                        </div>
          }
                </div>
            </div>
        </PalladioGate>);
}
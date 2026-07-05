import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Upload, Wand2, Loader2, FileText, Download, RefreshCcw, CheckCircle, ChevronDown, ChevronUp, Save, Bookmark, Brush, Monitor, Paintbrush } from 'lucide-react';
import { Link } from 'react-router-dom';
import { uploadToFirebase, validateUpload } from '@/lib/uploadHelper';
import { createPageUrl } from '@/utils';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import PalladioGate from '@/components/PalladioGate';
import SaveToProject from '@/components/SaveToProject';

const PRESETS = [
{
  key: 'architecturalStyle', label: 'Architectural Style',
  options: ['Mid-Century Modern', 'Brutalist', 'Japandi', 'Biophilic', 'Contemporary', 'Minimalist', 'Coastal']
},
{
  key: 'environment', label: 'Environment & Setting',
  options: ['Lush Pacific Northwest forest', 'Dense urban skyline', 'Suburban neighbourhood', 'Coastal waterfront', 'Desert landscape', 'Minimalist studio']
},
{
  key: 'lighting', label: 'Lighting & Atmosphere',
  options: ['Golden Hour', 'Blue Hour / Dusk', 'Midday', 'Overcast soft diffuse', 'Cinematic studio lighting', 'Moody atmospheric']
},
{
  key: 'camera', label: 'Camera & Framing',
  options: ['Eye-level human perspective', 'Interior wide-angle shot', 'Aerial drone view', 'Low-angle architectural', 'Close-up detail shot']
}];

const MATERIAL_LIBRARY = {
  wood: [
    {
      label: 'Honed White Oak',
      category: 'Wood',
      prompt: 'wide-plank honed white oak with visible natural grain, matte low-sheen finish, pale warm tone, soft tactile timber texture',
      bestUsedFor: 'Light, airy Scandinavian or modern minimalist flooring and millwork'
    },
    {
      label: 'Ebonized Ash',
      category: 'Wood',
      prompt: 'ebonized ash timber with deep charcoal-black grain, matte finish, subtle open-pore texture, high-contrast contemporary detailing',
      bestUsedFor: 'High-contrast, moody, or contemporary furniture accents'
    },
    {
      label: 'Natural Walnut Burl',
      category: 'Wood',
      prompt: 'natural walnut burl with rich swirling grain, satin finish, warm brown tone, luxurious mid-century cabinetry texture',
      bestUsedFor: 'Statement furniture and rich mid-century modern cabinetry'
    }
  ],
  stoneMasonry: [
    {
      label: 'Honed Calacatta Marble',
      category: 'Stone & Masonry',
      prompt: 'honed Calacatta marble with soft grey veining, matte stone finish, natural variation, no glossy plastic glare',
      bestUsedFor: 'Kitchen islands and vanities'
    },
    {
      label: 'Unfilled Travertine',
      category: 'Stone & Masonry',
      prompt: 'unfilled travertine with natural pores, warm beige tone, honed matte surface, tactile earthy stone texture',
      bestUsedFor: 'Warm, earthy floors, feature walls, or sculptural coffee tables'
    },
    {
      label: 'Rough Zellige Tile',
      category: 'Stone & Masonry',
      prompt: 'handmade rough zellige tile with irregular edges, subtle glaze variation, imperfect organic surface, light-catching texture',
      bestUsedFor: 'Backsplashes or showers to add organic, imperfect texture'
    }
  ],
  metals: [
    {
      label: 'Brushed Brass',
      category: 'Metals',
      prompt: 'brushed brass with warm satin sheen, fine linear grain, subtle patina, no mirror-like gold glare',
      bestUsedFor: 'Warm, modern hardware, lighting fixtures, and subtle accents'
    },
    {
      label: 'Blackened Steel',
      category: 'Metals',
      prompt: 'blackened steel with matte dark finish, subtle edge highlights, industrial depth and restrained reflectivity',
      bestUsedFor: 'Industrial window framing, staircases, and sleek fixtures'
    },
    {
      label: 'Aged Copper',
      category: 'Metals',
      prompt: 'aged copper with natural patina, warm oxidised variation, realistic weathering and handcrafted character',
      bestUsedFor: 'Vintage statement pieces with a natural, realistic patina'
    }
  ],
  textiles: [
    {
      label: 'Heavyweight Bouclé',
      category: 'Textiles',
      prompt: 'heavyweight bouclé upholstery with nubby tactile texture, soft off-white woven surface, cozy high-end furniture finish',
      bestUsedFor: 'Cozy, structured seating, sofas, and accent chairs'
    },
    {
      label: 'Slubbed Linen',
      category: 'Textiles',
      prompt: 'slubbed linen fabric with natural weave variation, soft matte texture, relaxed organic drape',
      bestUsedFor: 'Soft window treatments, natural bedding, and relaxed upholstery'
    },
    {
      label: 'Worn Saddle Leather',
      category: 'Textiles',
      prompt: 'worn saddle leather with warm caramel tone, creases, natural patina and subtle sheen from age',
      bestUsedFor: 'Adding warmth and character to lounge chairs or barstools'
    }
  ],
  finishes: [
    {
      label: 'Limewash Plaster',
      category: 'Finishes',
      prompt: 'limewash plaster walls with soft matte finish, subtle mottling, hand-applied texture and natural tonal movement',
      bestUsedFor: 'Walls and ceilings for a soft, matte, subtly mottled texture'
    },
    {
      label: 'Microcement',
      category: 'Finishes',
      prompt: 'microcement surface with seamless matte finish, fine mineral texture, subtle trowel movement and soft tonal variation',
      bestUsedFor: 'Minimalist, seamless floors or brutalist-inspired bathrooms'
    }
  ]
};

const getAllMaterials = () => Object.values(MATERIAL_LIBRARY || {}).flat();

const expandSelectedMaterials = (selectedMaterials = []) => {
  const allMaterials = getAllMaterials();

  return selectedMaterials
    .map((selected) => {
      const selectedLabel = typeof selected === 'string' ? selected : selected?.label;
      return allMaterials.find((m) => m.label === selectedLabel);
    })
    .filter(Boolean)
    .map((m) => `${m.category}: ${m.label} — ${m.prompt}. Best used for: ${m.bestUsedFor}.`)
    .join('\n');
};

const ASPECT_RATIOS = ['16:9', '9:16', '1:1', '4:3', '3:4', '4:5'];

const buildRenderPrompt = ({
  renderType,
  presets,
  userPrompt,
  aspectRatio
}) => {
  const selectedMaterials = presets?.materialPalette || [];
  const materialPrompt = expandSelectedMaterials(selectedMaterials);

  const architecturalStyle = presets?.architecturalStyle || 'Contemporary Australian residential architecture';
  const environment = presets?.environment || 'realistic high-end Australian residential setting';
  const lighting = presets?.lighting || 'soft natural architectural daylight';
  const camera = presets?.camera || 'professional architectural photography';

  return `
Create a photorealistic ${renderType || 'architectural'} render from the supplied base image.

Preserve the original design:
- building geometry
- roof form
- window and door locations
- walls and openings
- massing and proportions
- camera angle and perspective
- site orientation
- floorplan logic

Architectural style:
${architecturalStyle}

Selected tactile material palette:
${materialPrompt || 'Use restrained, high-end residential materials with matte, tactile, photorealistic finishes.'}

Environment / background:
${environment}

Lighting:
${lighting}

Camera / framing:
${camera}

Aspect ratio:
${aspectRatio || '16:9'}

Additional user direction:
${userPrompt || 'none'}

Material realism rules:
- Always specify the finish: matte, honed, brushed, woven, distressed, slubbed, patinated, mottled, weathered, or hand-applied where relevant.
- Pair materials with light interaction, e.g. raking sunlight highlighting plaster texture or soft daylight catching brushed brass.
- Embrace realistic imperfections: natural grain, slight patina, pores, tonal variation, organic irregularity, subtle wear.
- Avoid fake glossy AI materials.
- Avoid overly glossy marble or plastic-looking stone.
- Avoid mirror-like gold unless explicitly requested.
- Avoid warped geometry, distorted windows, random extra buildings, unreadable text, logos, watermarks, and signage.

Output quality:
High-end architectural visualisation, editorial real-estate photography, physically plausible materials, realistic shadows, refined detailing.
`;
};

export default function Render3D() {
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [styleFile, setStyleFile] = useState(null);
  const [styleFileUrl, setStyleFileUrl] = useState(null);
  const [stylePreviewUrl, setStylePreviewUrl] = useState(null);
  const [isUploadingStyle, setIsUploadingStyle] = useState(false);
  const [presets, setPresets] = useState({ materialPalette: [] });
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [seed, setSeed] = useState('');
  const [lockSeed, setLockSeed] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [currentRenderType, setCurrentRenderType] = useState(null);
  const [renderedImage, setRenderedImage] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [savedPresetsList, setSavedPresetsList] = useState([]);
  const [presetName, setPresetName] = useState('');
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [magicEditMode, setMagicEditMode] = useState(false);
  const [magicEditPrompt, setMagicEditPrompt] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [brushSize, setBrushSize] = useState(30);
  const imageRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const styleInputRef = useRef(null);

  useEffect(() => {
    fetchSavedPresets();
  }, []);

  const fetchSavedPresets = async () => {
    try {
      const data = await base44.entities.RenderPreset.list();
      setSavedPresetsList(data);
    } catch (err) {
      console.error('Failed to fetch presets:', err);
    }
  };

  const handleSavePreset = async () => {
    if (!presetName.trim()) return;
    setIsSavingPreset(true);
    try {
      await base44.entities.RenderPreset.create({
        name: presetName,
        presets: presets,
        prompt: prompt
      });
      setPresetName('');
      fetchSavedPresets();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingPreset(false);
    }
  };

  const applyPreset = (savedPreset) => {
    if (savedPreset.presets) setPresets(savedPreset.presets);
    if (savedPreset.prompt) setPrompt(savedPreset.prompt);
  };

  useEffect(() => {
    if (magicEditMode && imageRef.current && canvasRef.current) {
      canvasRef.current.width = imageRef.current.naturalWidth;
      canvasRef.current.height = imageRef.current.naturalHeight;
      setHasDrawn(false);
    }
  }, [magicEditMode]);

  const getCoordinates = (e) => {
    if (!canvasRef.current) return { offsetX: 0, offsetY: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      offsetX: (clientX - rect.left) * scaleX,
      offsetY: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e) => {
    const { offsetX, offsetY } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    if (e.cancelable) e.preventDefault(); // Prevent scrolling on touch devices while drawing
    const { offsetX, offsetY } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(offsetX, offsetY);
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.6)'; // Amber with opacity
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHasDrawn(false);
  };

  const handleCaptureScreen = async (e) => {
    if (e) e.stopPropagation();
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: 'window' } });
      const video = document.createElement('video');
      video.srcObject = stream;
      await new Promise((resolve) => {
        video.onloadedmetadata = () => {
          video.play();
          resolve();
        };
      });

      await new Promise((resolve) => setTimeout(resolve, 300));

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      stream.getTracks().forEach((track) => track.stop());

      if (blob) {
        const capturedFile = new File([blob], 'screenshot.jpg', { type: 'image/jpeg' });
        setFile(capturedFile);
        setRenderedImage(null);
        setPreviewUrl(URL.createObjectURL(capturedFile));

        setIsUploading(true);
        try {
          const { file_url } = await uploadToFirebase(capturedFile);
          setFileUrl(file_url);
        } finally {
          setIsUploading(false);
        }
      }
    } catch (err) {
      console.error('Failed to capture screen:', err);
      if (err.name !== 'NotAllowedError') {
        toast.error('Failed to capture screen.');
      }
    }
  };

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const vErr = validateUpload(selectedFile, ['image/', 'application/pdf'], 25);
    if (vErr) {
      toast.error(vErr);
      e.target.value = '';
      return;
    }

    if (selectedFile.type === 'application/pdf') {
      toast.warning("Please upload an image or screenshot for 3D rendering. PDFs are better handled by Plan Assess.");
      e.target.value = null;
      return;
    }

    setFile(selectedFile);
    setRenderedImage(null);

    if (selectedFile.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(selectedFile));
    } else {
      setPreviewUrl(null);
    }

    setIsUploading(true);
    try {
      const { file_url } = await uploadToFirebase(selectedFile);
      setFileUrl(file_url);
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Couldn't read this file. If it's from OneDrive or a phone link, make it available offline first (right-click → 'Always keep on this device'), then try again.");
      setFile(null);
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleStyleSelect = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const vErr = validateUpload(selectedFile, ['image/'], 25);
    if (vErr) {
      toast.error(vErr);
      e.target.value = '';
      return;
    }

    setStyleFile(selectedFile);

    if (selectedFile.type.startsWith('image/')) {
      setStylePreviewUrl(URL.createObjectURL(selectedFile));
    } else {
      setStylePreviewUrl(null);
    }

    setIsUploadingStyle(true);
    try {
      const { file_url } = await uploadToFirebase(selectedFile);
      setStyleFileUrl(file_url);
    } catch (err) {
      console.error("Style upload error:", err);
      toast.error("Couldn't read this file. If it's from OneDrive or a phone link, make it available offline first (right-click → 'Always keep on this device'), then try again.");
      setStyleFile(null);
      setStylePreviewUrl(null);
    } finally {
      setIsUploadingStyle(false);
    }
  };

  const handleRender = async (type = 'exterior') => {
    if (!fileUrl) return;
    const tokenRes = await base44.functions.invoke('consumeToken', { amount: 5 });
    if (tokenRes.data?.error) {
      toast.error("You don't have enough AI tokens. Renders require 5 tokens. Please upgrade your plan.");
      return;
    }
    setIsRendering(true);
    setCurrentRenderType(type);
    setRenderedImage(null);

    const typeText = type === 'interior' ? 'interior' : 'exterior';

    try {
      const imageUrls = [fileUrl];
      if (styleFileUrl) imageUrls.push(styleFileUrl);

      const finalPrompt = buildRenderPrompt({
        renderType: typeText,
        presets,
        userPrompt: prompt,
        aspectRatio
      });

      const result = await base44.integrations.Core.GenerateImage({
        prompt: finalPrompt,
        existing_image_urls: imageUrls
      });

      if (!result || !result.url) {
        throw new Error('Image generation did not return a URL');
      }

      setRenderedImage(result.url);
      setMagicEditMode(false);
      
      try {
        await base44.entities.ProjectAsset.create({
           project_id: 'generate-render-history', // pseudo id for history
           file_url: result.url,
           file_name: `render-${typeText}-${Date.now()}.jpg`,
           asset_type: 'render',
           description: finalPrompt.substring(0, 1000)
        });
      } catch (saveErr) {
        console.error("Optional save failed:", saveErr);
      }

    } catch (err) {
      console.error(err);
      toast.error("Failed to generate render.");
    } finally {
      setIsRendering(false);
    }
  };

  const handleMagicEdit = async () => {
    if (!renderedImage || !magicEditPrompt.trim()) return;
    const tokenRes = await base44.functions.invoke('consumeToken', { amount: 5 });
    if (tokenRes.data?.error) {
      toast.error("You don't have enough AI tokens. Magic Edit requires 5 tokens. Please upgrade your plan.");
      return;
    }
    setIsEditing(true);

    try {
      let maskUrl = null;
      if (hasDrawn && canvasRef.current) {
        const blob = await new Promise((resolve) => canvasRef.current.toBlob(resolve, 'image/png'));
        if (blob) {
          const file = new File([blob], 'mask.png', { type: 'image/png' });
          const uploadRes = await uploadToFirebase(file);
          maskUrl = uploadRes.file_url;
        }
      }

      const imageUrls = [renderedImage];
      if (maskUrl) imageUrls.push(maskUrl);

      const params = {
        prompt: `MAGIC EDIT EXACTLY AS REQUESTED: ${magicEditPrompt}. KEEP THE REST OF THE IMAGE EXACTLY THE SAME. ${maskUrl ? 'The second image is a mask highlighting the specific area to change.' : ''} PHOTOREALISTIC ARCHITECTURAL RENDER.`,
        existing_image_urls: imageUrls
      };

      const result = await base44.integrations.Core.GenerateImage(params);
      setRenderedImage(result.url);
      setHasDrawn(false);
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      toast.success("Magic edit applied!");
    } catch (err) {
      toast.error("Failed to apply edit");
      console.error(err);
    } finally {
      setIsEditing(false);
      setMagicEditPrompt('');
      setMagicEditMode(false);
    }
  };

  return (
    <PalladioGate>
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a14' }}>
      {/* Header */}
      <div style={{
          display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
          position: 'sticky', top: 0, zIndex: 10,
          backgroundColor: '#0a0a14', borderBottom: '1px solid #1e293b'
        }}>
        <Link to={createPageUrl('Home')}>
          <Button variant="ghost" size="icon" className="hover:text-white hover:bg-gray-800 rounded-xl">
            <ArrowLeft size={20} />
          </Button>
        </Link>
        <div>
          <h1 className="text-white font-semibold text-xl">3D Architectural Renderer</h1>
          <p className="text-sm text-teal-400">AI-Powered Photorealistic Visualisation</p>
        </div>
      </div>

      <div className="px-4 py-5 space-y-6" style={{ maxWidth: '520px', margin: '0 auto' }}>

        {/* Upload Section */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex flex-col mb-3">
              <h2 className="text-white text-sm font-semibold mb-2">1. 3D Building View</h2>
              <button
                  onClick={handleCaptureScreen}
                  className="flex items-center w-fit text-[10px] font-medium text-teal-400 hover:text-teal-300 bg-teal-400/10 hover:bg-teal-400/20 px-2 py-1 rounded transition-colors">
                  
                <Monitor size={12} className="mr-1" /> Screenshot
              </button>
            </div>
            <div
                onClick={() => fileInputRef.current?.click()}
                className="rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col justify-center items-center h-[200px]"
                style={{
                  border: `2px dashed ${fileUrl ? '#14b8a6' : '#334155'}`,
                  backgroundColor: '#0f172a'
                }}>
                
              {isUploading ?
                <div className="flex flex-col items-center gap-2">
                  <Loader2 size={24} className="animate-spin" style={{ color: '#14b8a6' }} />
                  <p className="text-gray-400 text-xs">Uploading...</p>
                </div> :
                previewUrl ?
                <img
                  src={previewUrl}
                  alt="3D view preview"
                  className="mx-auto rounded-xl object-contain h-full w-full" /> :

                file && !previewUrl ?
                <div className="flex flex-col items-center gap-2">
                  <FileText size={24} style={{ color: '#14b8a6' }} />
                  <p className="text-white text-xs font-medium truncate w-full px-2">{file.name}</p>
                </div> :

                <div className="flex flex-col items-center gap-2">
                  <Upload size={24} style={{ color: '#475569' }} />
                  <div>
                    <p className="text-white text-sm font-medium">Upload view</p>
                    <p className="text-gray-500 text-[10px] mt-1">Image (JPG, PNG)</p>
                  </div>
                </div>
                }
              <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden" />
                
            </div>
            {fileUrl && !isUploading &&
              <div className="flex items-center gap-1 mt-2">
                <CheckCircle size={12} style={{ color: '#14b8a6' }} />
                <span className="text-[10px]" style={{ color: '#14b8a6' }}>Main view ready</span>
              </div>
              }
          </div>

          <div>
            <div className="flex flex-wrap justify-between items-center mb-3">
              <h2 className="text-white text-sm font-semibold">2. Style Reference (Opt)</h2>
              <p className="text-teal-400 text-[10px] font-medium mt-2 flex items-center justify-center">
                <Paintbrush size={10} className="mr-1" /> Match the style of an image
              </p>
            </div>
            <div
                onClick={() => styleInputRef.current?.click()}
                className="rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col justify-center items-center h-[200px]"
                style={{
                  border: `2px dashed ${styleFileUrl ? '#14b8a6' : '#334155'}`,
                  backgroundColor: '#0f172a'
                }}>
                
              {isUploadingStyle ?
                <div className="flex flex-col items-center gap-2">
                  <Loader2 size={24} className="animate-spin" style={{ color: '#14b8a6' }} />
                  <p className="text-gray-400 text-xs">Uploading...</p>
                </div> :
                stylePreviewUrl ?
                <img
                  src={stylePreviewUrl}
                  alt="Style preview"
                  className="mx-auto rounded-xl object-contain h-full w-full" /> :

                styleFile && !stylePreviewUrl ?
                <div className="flex flex-col items-center gap-2">
                  <FileText size={24} style={{ color: '#14b8a6' }} />
                  <p className="text-white text-xs font-medium truncate w-full px-2">{styleFile.name}</p>
                </div> :

                <div className="flex flex-col items-center gap-2">
                  <Upload size={24} style={{ color: '#475569' }} />
                  <div>
                    <p className="text-white text-sm font-medium">Style inspiration</p>
                    <p className="text-gray-500 text-[10px] mt-1">Image (e.g. materials)</p>
                  </div>
                </div>
                }
              <input
                  ref={styleInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleStyleSelect}
                  className="hidden" />
                
            </div>
            {styleFileUrl && !isUploadingStyle &&
              <div className="flex items-center gap-1 mt-2">
                <CheckCircle size={12} style={{ color: '#14b8a6' }} />
                <span className="text-[10px]" style={{ color: '#14b8a6' }}>Style applied</span>
              </div>
              }
          </div>
        </div>

        {/* Presets */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-white text-sm font-semibold">Rendering Presets</h2>
            {savedPresetsList.length > 0 &&
              <Select onValueChange={(id) => applyPreset(savedPresetsList.find((p) => p.id === id))}>
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white text-xs h-8 w-[160px]">
                  <Bookmark size={14} className="mr-2 text-teal-400" />
                  <SelectValue placeholder="Load preset..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  {savedPresetsList.map((p) =>
                  <SelectItem key={p.id} value={p.id} className="text-white text-xs cursor-pointer">
                      {p.name}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              }
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {PRESETS.map(({ key, label, options }) =>
              <div key={key}>
                <label className="block text-xs mb-1.5" style={{ color: '#94a3b8' }}>{label}</label>
                <Select value={presets[key] || ''} onValueChange={(val) => setPresets((p) => ({ ...p, [key]: val }))}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white text-xs h-9 rounded-xl">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    {options.map((opt) =>
                    <SelectItem key={opt} value={opt} className="text-white text-xs focus:bg-slate-800 focus:text-white cursor-pointer">
                        {opt}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              )}
          </div>

          <div className="mb-4">
            <label className="block text-xs mb-1.5" style={{ color: '#94a3b8' }}>Material Palette</label>
            <div className="space-y-3">
              {Object.entries(MATERIAL_LIBRARY).map(([catKey, items]) => (
                <div key={catKey}>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">{items[0].category}</p>
                  <div className="flex flex-wrap gap-2">
                    {items.map((mat) => {
                      const isSelected = presets.materialPalette?.includes(mat.label);
                      return (
                        <button
                  type="button"
                  key={mat.label}
                          onClick={() => {
                            setPresets(p => {
                              const current = p.materialPalette || [];
                              return {
                                ...p,
                                materialPalette: isSelected
                                  ? current.filter(x => x !== mat.label)
                                  : [...current, mat.label]
                              };
                            });
                          }}
                          title={mat.bestUsedFor}
                          className={`px-4 py-2 rounded-full text-[10px] font-medium transition-colors ${isSelected ? 'bg-teal-500/20 text-teal-400 border border-teal-500/50' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-slate-200'}`}
                        >
                          {mat.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <Button
                variant="ghost"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl justify-between h-9">
                
              <span>Advanced Generation Settings</span>
              {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </Button>
            
            {showAdvanced &&
              <div className="flex flex-col gap-3 mt-3 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                
                <div>
                  <label className="block text-xs mb-1.5 text-slate-400">Aspect Ratio</label>
                  <Select value={aspectRatio} onValueChange={setAspectRatio}>
                    <SelectTrigger className="bg-slate-900 border-slate-700 text-white text-xs h-9 rounded-xl">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      {ASPECT_RATIOS.map((opt) =>
                        <SelectItem key={opt} value={opt} className="text-white text-xs cursor-pointer">{opt}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-xs mb-1.5 text-slate-400">Seed Configuration</label>
                  <div className="flex gap-2 items-center">
                    <Input 
                      type="number" 
                      placeholder="Random Seed (leave blank)" 
                      value={seed} 
                      onChange={(e) => setSeed(e.target.value)} 
                      className="bg-slate-900 border-slate-700 text-white text-xs h-9 rounded-xl flex-1" 
                      disabled={!lockSeed}
                    />
                    <button 
                      onClick={() => setLockSeed(!lockSeed)}
                      className={`h-9 px-3 rounded-xl text-xs font-medium border ${lockSeed ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
                    >
                      {lockSeed ? 'Locked' : 'Unlocked'}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Locking the seed helps maintain architectural consistency when only changing materials.</p>
                </div>

              </div>
              }
          </div>
        </div>

        {/* AI Instructions */}
        <div>
          <h2 className="text-white text-sm font-semibold mb-3">AI Instructions</h2>
          <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="E.g. 'Add lush landscaping and people walking, a water feature at the entrance. Use warm Mediterranean tones with olive trees lining the path...'"
              className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-600 text-sm rounded-xl min-h-[110px] resize-none mb-3" />
            
          
          <div className="flex gap-2">
            <Input
                placeholder="Preset name (e.g. My Custom Villa)"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white text-xs h-9 rounded-xl" />
              
            <Button
                onClick={handleSavePreset}
                disabled={isSavingPreset || !presetName.trim()}
                variant="outline"
                className="h-9 text-xs rounded-xl border-slate-700 text-slate-300 hover:text-white shrink-0">
                
              {isSavingPreset ? <Loader2 size={14} className="animate-spin mr-2" /> : <Save size={14} className="mr-2" />}
              Save Preset
            </Button>
          </div>
        </div>

        {/* Render Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
              onClick={() => handleRender('exterior')}
              disabled={!fileUrl || isRendering}
              className="sm:flex-1 py-6 text-base font-semibold rounded-xl disabled:opacity-40"
              style={{ backgroundColor: '#14b8a6', color: 'white' }}>
              
            {isRendering && currentRenderType === 'exterior' ?
              <>
                <Loader2 size={20} className="animate-spin mr-2" />
                Generating...
              </> :

              <>
                <Wand2 size={20} className="mr-2" />
                Exterior Render
              </>
              }
          </Button>
          <Button
              onClick={() => handleRender('interior')}
              disabled={!fileUrl || isRendering}
              className="sm:flex-1 py-6 text-base font-semibold rounded-xl disabled:opacity-40"
              style={{ backgroundColor: '#8b5cf6', color: 'white' }}>
              
            {isRendering && currentRenderType === 'interior' ?
              <>
                <Loader2 size={20} className="animate-spin mr-2" />
                Generating...
              </> :

              <>
                <Wand2 size={20} className="mr-2" />
                Interior Render
              </>
              }
          </Button>
        </div>

        {/* Result */}
        {renderedImage &&
          <div>
            <h2 className="text-white text-sm font-semibold mb-3">Your Rendered Design</h2>
            <div className="rounded-2xl overflow-hidden mb-3 relative" style={{ border: '1px solid rgba(20,184,166,0.35)' }}>
              <img
                ref={imageRef}
                src={renderedImage}
                alt="AI Architectural Render"
                className="w-full block"
                onLoad={() => {
                  if (magicEditMode && canvasRef.current && imageRef.current) {
                    canvasRef.current.width = imageRef.current.naturalWidth;
                    canvasRef.current.height = imageRef.current.naturalHeight;
                  }
                }} />
              
              {magicEditMode &&
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="absolute top-0 left-0 w-full h-full cursor-crosshair"
                style={{ touchAction: 'none' }} />

              }
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={renderedImage}
                download="palladio-render.jpg"
                target="_blank"
                rel="noopener noreferrer"
                className="sm:flex-1"
                style={{ textDecoration: 'none' }}>
                
                <Button variant="outline" className="w-full rounded-xl border-teal-600/50 text-teal-400 hover:bg-teal-500/10 hover:text-teal-300">
                  <Download size={15} className="mr-2" />
                  Download
                </Button>
              </a>
              <Button
                onClick={() => handleRender(currentRenderType || 'exterior')}
                variant="outline"
                className="sm:flex-1 rounded-xl border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white">
                
                <RefreshCcw size={15} className="mr-2" />
                Re-render
              </Button>
              <SaveToProject
                fileUrl={renderedImage}
                fileName="palladio-render.jpg"
                assetType="render"
                className="sm:flex-1 rounded-xl border-teal-600/50 text-teal-400 hover:bg-teal-500/10 hover:text-teal-300" />
              
            </div>
            
            <div className="mt-4 p-4 rounded-xl border border-slate-700/50 bg-slate-800/20">
              <Button
                variant="ghost"
                onClick={() => setMagicEditMode(!magicEditMode)}
                className="w-full justify-start h-auto p-0 hover:bg-transparent text-indigo-400 hover:text-indigo-300">
                
                <Brush size={16} className="mr-2" />
                <span className="font-medium text-sm">Magic Edit</span>
                {magicEditMode ? <ChevronUp size={14} className="ml-auto" /> : <ChevronDown size={14} className="ml-auto" />}
              </Button>

              {magicEditMode &&
              <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-amber-400 font-medium flex items-center gap-1.5">
                      <Brush size={14} /> Draw over the image to highlight areas
                    </p>
                    {hasDrawn &&
                  <button onClick={clearCanvas} className="text-xs text-slate-400 hover:text-red-400 transition-colors">
                        Clear Brush
                      </button>
                  }
                  </div>
                  
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs text-slate-400">Brush Size:</span>
                    <input
                    type="range"
                    min="10"
                    max="100"
                    value={brushSize}
                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                    className="flex-1 accent-amber-500" />
                  
                  </div>

                  <p className="text-xs text-slate-400 mt-2">Describe what you want to change in the highlighted area.</p>
                  <Textarea
                  value={magicEditPrompt}
                  onChange={(e) => setMagicEditPrompt(e.target.value)}
                  placeholder="E.g. 'Make the sky darker', 'Change the wood siding to brick', 'Add a person walking on the sidewalk'"
                  className="bg-slate-900 border-slate-700 text-white text-sm rounded-xl min-h-[80px] resize-none" />
                
                  <Button
                  onClick={handleMagicEdit}
                  disabled={isEditing || !magicEditPrompt.trim()}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-10">
                  
                    {isEditing ?
                  <><Loader2 size={16} className="animate-spin mr-2" /> Editing...</> :

                  <><Wand2 size={16} className="mr-2" /> Apply Magic Edit</>
                  }
                  </Button>
                </div>
              }
            </div>
          </div>
          }
      </div>
    </div>
    </PalladioGate>);

}
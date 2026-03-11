import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Upload, Wand2, Loader2, FileText, Download, RefreshCcw, CheckCircle, ChevronDown, ChevronUp, Save, Bookmark, Brush, Monitor } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const PRESETS = [
  {
    key: 'wallMaterial', label: 'Wall Material',
    options: [
      'Red Brick', 'Exposed Concrete', 'Glass Curtain Wall', 'Timber / Wood Panel',
      'Natural Stone', 'White Render / Stucco', 'Steel Cladding', 'Terracotta Panels',
      'Limestone', 'Weathered Corten Steel'
    ]
  },
  {
    key: 'roofMaterial', label: 'Roof Material',
    options: [
      'Clay / Terracotta Tiles', 'Metal / Standing Seam', 'Green / Planted Roof',
      'Flat White Concrete', 'Slate Tiles', 'Glass / Skylight', 'Asphalt Shingles', 'Copper Roof'
    ]
  },
  {
    key: 'timeOfDay', label: 'Time of Day',
    options: [
      'Golden Hour (Sunrise)', 'Bright Midday Sun', 'Warm Sunset / Dusk',
      'Blue Hour (Night)', 'Overcast / Soft Diffuse', 'Dramatic Storm Light'
    ]
  },
  {
    key: 'background', label: 'Background',
    options: [
      'Urban Cityscape', 'Suburban Neighbourhood', 'Rural Countryside',
      'Mountain Landscape', 'Coastal / Waterfront', 'Open Sky (Minimal)',
      'Lush Garden / Park', 'Desert Landscape', 'Snowy Winter Scene'
    ]
  },
];

const ADVANCED_PRESETS = [
  {
    key: 'cameraAngle', label: 'Camera Angle',
    options: ['Eye Level', "Low Angle (Worm's Eye)", 'High Angle', "Bird's Eye", 'Aerial View', 'Drone Shot']
  },
  {
    key: 'lightingStyle', label: 'Lighting Style',
    options: ['Natural Light', 'Studio Lighting', 'Dramatic Shadows', 'Soft Ambient', 'Cinematic Lighting', 'High Contrast', 'Neon / Cyberpunk']
  },
  {
    key: 'mood', label: 'Mood / Atmosphere',
    options: ['Serene & Calm', 'Vibrant & Lively', 'Futuristic & Sci-Fi', 'Dark & Moody', 'Ethereal & Dreamy', 'Warm & Inviting']
  }
];

export default function Render3D() {
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [styleFile, setStyleFile] = useState(null);
  const [styleFileUrl, setStyleFileUrl] = useState(null);
  const [stylePreviewUrl, setStylePreviewUrl] = useState(null);
  const [isUploadingStyle, setIsUploadingStyle] = useState(false);
  const [presets, setPresets] = useState({});
  const [prompt, setPrompt] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
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
      canvasRef.current.width = imageRef.current.clientWidth;
      canvasRef.current.height = imageRef.current.clientHeight;
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

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setRenderedImage(null);

    if (selectedFile.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(selectedFile));
    } else {
      setPreviewUrl(null);
    }

    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: selectedFile });
      setFileUrl(file_url);
    } finally {
      setIsUploading(false);
    }
  };

  const handleStyleSelect = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    setStyleFile(selectedFile);

    if (selectedFile.type.startsWith('image/')) {
      setStylePreviewUrl(URL.createObjectURL(selectedFile));
    } else {
      setStylePreviewUrl(null);
    }

    setIsUploadingStyle(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: selectedFile });
      setStyleFileUrl(file_url);
    } finally {
      setIsUploadingStyle(false);
    }
  };

  const handleRender = async () => {
    if (!fileUrl) return;
    setIsRendering(true);
    setRenderedImage(null);

    const lines = [
      'Create a highly photorealistic professional architectural exterior rendering.',
      presets.wallMaterial ? `Wall material: ${presets.wallMaterial}.` : '',
      presets.roofMaterial ? `Roof material: ${presets.roofMaterial}.` : '',
      presets.timeOfDay ? `Lighting / time of day: ${presets.timeOfDay}.` : '',
      presets.background ? `Environment and background: ${presets.background}.` : '',
      presets.cameraAngle ? `Camera angle: ${presets.cameraAngle}.` : '',
      presets.lightingStyle ? `Lighting style: ${presets.lightingStyle}.` : '',
      presets.mood ? `Mood/Atmosphere: ${presets.mood}.` : '',
      'Maintain the exact architectural form, proportions, massing and structure from the reference black and white 3D view.',
      'Add photorealistic textures, materials, atmospheric lighting, shadows, reflections and environmental details.',
      'Professional architectural visualisation quality. High detail, photorealistic.',
      prompt ? `Additional instructions: ${prompt}` : '',
      styleFileUrl ? 'CRITICAL INSTRUCTION: Match the aesthetic, colors, materials, style, and overall mood of the provided style reference image.' : ''
    ].filter(Boolean);

    const constructedPrompt = lines.join('\n');
    const isImage = file?.type?.startsWith('image/');
    const params = { prompt: constructedPrompt };
    
    const imageUrls = [];
    if (isImage && fileUrl) imageUrls.push(fileUrl);
    if (styleFileUrl) imageUrls.push(styleFileUrl);
    
    if (imageUrls.length > 0) {
      params.existing_image_urls = imageUrls;
    }

    try {
      const result = await base44.integrations.Core.GenerateImage(params);
      setRenderedImage(result.url);
      setMagicEditMode(false);
    } finally {
      setIsRendering(false);
    }
  };

  const handleMagicEdit = async () => {
    if (!renderedImage || !magicEditPrompt.trim()) return;
    setIsEditing(true);

    try {
      let maskUrl = null;
      if (hasDrawn && canvasRef.current) {
        const blob = await new Promise(resolve => canvasRef.current.toBlob(resolve, 'image/png'));
        if (blob) {
          const file = new File([blob], 'mask.png', { type: 'image/png' });
          const uploadRes = await base44.integrations.Core.UploadFile({ file });
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
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a14' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
        position: 'sticky', top: 0, zIndex: 10,
        backgroundColor: '#0a0a14', borderBottom: '1px solid #1e293b'
      }}>
        <Link to={createPageUrl('Home')}>
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl">
            <ArrowLeft size={20} />
          </Button>
        </Link>
        <div>
          <h1 className="text-white font-semibold text-base">3D Architectural Renderer</h1>
          <p style={{ color: '#14b8a6', fontSize: '12px' }}>AI-Powered Photorealistic Visualisation</p>
        </div>
      </div>

      <div className="px-4 py-5 space-y-6" style={{ maxWidth: '520px', margin: '0 auto' }}>

        {/* Upload Section */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h2 className="text-white text-sm font-semibold mb-3">1. 3D Building View</h2>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col justify-center items-center h-[200px]"
              style={{
                border: `2px dashed ${fileUrl ? '#14b8a6' : '#334155'}`,
                backgroundColor: '#0f172a'
              }}
            >
              {isUploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 size={24} className="animate-spin" style={{ color: '#14b8a6' }} />
                  <p className="text-gray-400 text-xs">Uploading...</p>
                </div>
              ) : previewUrl ? (
                <img
                  src={previewUrl}
                  alt="3D view preview"
                  className="mx-auto rounded-xl object-contain h-full w-full"
                />
              ) : file && !previewUrl ? (
                <div className="flex flex-col items-center gap-2">
                  <FileText size={24} style={{ color: '#14b8a6' }} />
                  <p className="text-white text-xs font-medium truncate w-full px-2">{file.name}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload size={24} style={{ color: '#475569' }} />
                  <div>
                    <p className="text-white text-sm font-medium">Upload view</p>
                    <p className="text-gray-500 text-[10px] mt-1">Image or PDF</p>
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
            {fileUrl && !isUploading && (
              <div className="flex items-center gap-1 mt-2">
                <CheckCircle size={12} style={{ color: '#14b8a6' }} />
                <span className="text-[10px]" style={{ color: '#14b8a6' }}>Main view ready</span>
              </div>
            )}
          </div>

          <div>
            <h2 className="text-white text-sm font-semibold mb-3">2. Style Reference (Opt)</h2>
            <div
              onClick={() => styleInputRef.current?.click()}
              className="rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col justify-center items-center h-[200px]"
              style={{
                border: `2px dashed ${styleFileUrl ? '#14b8a6' : '#334155'}`,
                backgroundColor: '#0f172a'
              }}
            >
              {isUploadingStyle ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 size={24} className="animate-spin" style={{ color: '#14b8a6' }} />
                  <p className="text-gray-400 text-xs">Uploading...</p>
                </div>
              ) : stylePreviewUrl ? (
                <img
                  src={stylePreviewUrl}
                  alt="Style preview"
                  className="mx-auto rounded-xl object-contain h-full w-full"
                />
              ) : styleFile && !stylePreviewUrl ? (
                <div className="flex flex-col items-center gap-2">
                  <FileText size={24} style={{ color: '#14b8a6' }} />
                  <p className="text-white text-xs font-medium truncate w-full px-2">{styleFile.name}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload size={24} style={{ color: '#475569' }} />
                  <div>
                    <p className="text-white text-sm font-medium">Style inspiration</p>
                    <p className="text-gray-500 text-[10px] mt-1">Image (e.g. materials)</p>
                  </div>
                </div>
              )}
              <input
                ref={styleInputRef}
                type="file"
                accept="image/*"
                onChange={handleStyleSelect}
                className="hidden"
              />
            </div>
            {styleFileUrl && !isUploadingStyle && (
              <div className="flex items-center gap-1 mt-2">
                <CheckCircle size={12} style={{ color: '#14b8a6' }} />
                <span className="text-[10px]" style={{ color: '#14b8a6' }}>Style applied</span>
              </div>
            )}
          </div>
        </div>

        {/* Presets */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-white text-sm font-semibold">Rendering Presets</h2>
            {savedPresetsList.length > 0 && (
              <Select onValueChange={(id) => applyPreset(savedPresetsList.find(p => p.id === id))}>
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white text-xs h-8 w-[160px]">
                  <Bookmark size={14} className="mr-2 text-teal-400" />
                  <SelectValue placeholder="Load preset..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  {savedPresetsList.map(p => (
                    <SelectItem key={p.id} value={p.id} className="text-white text-xs cursor-pointer">
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {PRESETS.map(({ key, label, options }) => (
              <div key={key}>
                <label className="block text-xs mb-1.5" style={{ color: '#94a3b8' }}>{label}</label>
                <Select value={presets[key] || ''} onValueChange={(val) => setPresets(p => ({ ...p, [key]: val }))}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white text-xs h-9 rounded-xl">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    {options.map(opt => (
                      <SelectItem key={opt} value={opt} className="text-white text-xs focus:bg-slate-800 focus:text-white cursor-pointer">
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          <div className="mb-4">
            <Button
              variant="ghost"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl justify-between h-9"
            >
              <span>Advanced Options</span>
              {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </Button>
            
            {showAdvanced && (
              <div className="grid grid-cols-2 gap-3 mt-3 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                {ADVANCED_PRESETS.map(({ key, label, options }) => (
                  <div key={key}>
                    <label className="block text-xs mb-1.5" style={{ color: '#94a3b8' }}>{label}</label>
                    <Select value={presets[key] || ''} onValueChange={(val) => setPresets(p => ({ ...p, [key]: val }))}>
                      <SelectTrigger className="bg-slate-900 border-slate-700 text-white text-xs h-9 rounded-xl">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-700">
                        {options.map(opt => (
                          <SelectItem key={opt} value={opt} className="text-white text-xs focus:bg-slate-800 focus:text-white cursor-pointer">
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* AI Instructions */}
        <div>
          <h2 className="text-white text-sm font-semibold mb-3">AI Instructions</h2>
          <Textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="E.g. 'Add lush landscaping and people walking, a water feature at the entrance. Use warm Mediterranean tones with olive trees lining the path...'"
            className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-600 text-sm rounded-xl min-h-[110px] resize-none mb-3"
          />
          
          <div className="flex gap-2">
            <Input 
              placeholder="Preset name (e.g. My Custom Villa)" 
              value={presetName}
              onChange={e => setPresetName(e.target.value)}
              className="bg-slate-900 border-slate-700 text-white text-xs h-9 rounded-xl"
            />
            <Button 
              onClick={handleSavePreset} 
              disabled={isSavingPreset || !presetName.trim()}
              variant="outline"
              className="h-9 text-xs rounded-xl border-slate-700 text-slate-300 hover:text-white shrink-0"
            >
              {isSavingPreset ? <Loader2 size={14} className="animate-spin mr-2" /> : <Save size={14} className="mr-2" />}
              Save Preset
            </Button>
          </div>
        </div>

        {/* Render Button */}
        <Button
          onClick={handleRender}
          disabled={!fileUrl || isRendering}
          className="w-full py-6 text-base font-semibold rounded-xl disabled:opacity-40"
          style={{ backgroundColor: '#14b8a6', color: 'white' }}
        >
          {isRendering ? (
            <>
              <Loader2 size={20} className="animate-spin mr-2" />
              Generating Render… (~30 seconds)
            </>
          ) : (
            <>
              <Wand2 size={20} className="mr-2" />
              Generate AI Render
            </>
          )}
        </Button>

        {/* Result */}
        {renderedImage && (
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
                    canvasRef.current.width = imageRef.current.clientWidth;
                    canvasRef.current.height = imageRef.current.clientHeight;
                  }
                }}
              />
              {magicEditMode && (
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
                  style={{ touchAction: 'none' }}
                />
              )}
            </div>
            <div className="flex gap-3">
              <a
                href={renderedImage}
                download="palladio-render.jpg"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
                style={{ textDecoration: 'none' }}
              >
                <Button variant="outline" className="w-full rounded-xl border-teal-600/50 text-teal-400 hover:bg-teal-500/10 hover:text-teal-300">
                  <Download size={15} className="mr-2" />
                  Download
                </Button>
              </a>
              <Button
                onClick={handleRender}
                variant="outline"
                className="flex-1 rounded-xl border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <RefreshCcw size={15} className="mr-2" />
                Re-render
              </Button>
            </div>
            
            <div className="mt-4 p-4 rounded-xl border border-slate-700/50 bg-slate-800/20">
              <Button
                variant="ghost"
                onClick={() => setMagicEditMode(!magicEditMode)}
                className="w-full justify-start h-auto p-0 hover:bg-transparent text-indigo-400 hover:text-indigo-300"
              >
                <Brush size={16} className="mr-2" />
                <span className="font-medium text-sm">Magic Edit</span>
                {magicEditMode ? <ChevronUp size={14} className="ml-auto" /> : <ChevronDown size={14} className="ml-auto" />}
              </Button>

              {magicEditMode && (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-amber-400 font-medium flex items-center gap-1.5">
                      <Brush size={14} /> Draw over the image to highlight areas
                    </p>
                    {hasDrawn && (
                      <button onClick={clearCanvas} className="text-xs text-slate-400 hover:text-red-400 transition-colors">
                        Clear Brush
                      </button>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs text-slate-400">Brush Size:</span>
                    <input 
                      type="range" 
                      min="10" 
                      max="100" 
                      value={brushSize} 
                      onChange={(e) => setBrushSize(parseInt(e.target.value))}
                      className="flex-1 accent-amber-500"
                    />
                  </div>

                  <p className="text-xs text-slate-400 mt-2">Describe what you want to change in the highlighted area.</p>
                  <Textarea
                    value={magicEditPrompt}
                    onChange={e => setMagicEditPrompt(e.target.value)}
                    placeholder="E.g. 'Make the sky darker', 'Change the wood siding to brick', 'Add a person walking on the sidewalk'"
                    className="bg-slate-900 border-slate-700 text-white text-sm rounded-xl min-h-[80px] resize-none"
                  />
                  <Button 
                    onClick={handleMagicEdit}
                    disabled={isEditing || !magicEditPrompt.trim()}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-10"
                  >
                    {isEditing ? (
                      <><Loader2 size={16} className="animate-spin mr-2" /> Editing...</>
                    ) : (
                      <><Wand2 size={16} className="mr-2" /> Apply Magic Edit</>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
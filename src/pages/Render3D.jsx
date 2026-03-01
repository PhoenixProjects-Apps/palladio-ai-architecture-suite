import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Upload, Wand2, Loader2, FileText, Download, RefreshCcw, CheckCircle, ChevronDown, ChevronUp, Save, Bookmark } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Input } from '@/components/ui/input';

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
    } finally {
      setIsRendering(false);
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

        {/* Upload */}
        <div>
          <h2 className="text-white text-sm font-semibold mb-3">Upload Your 3D Building View</h2>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="rounded-2xl p-8 text-center cursor-pointer transition-all"
            style={{
              border: `2px dashed ${fileUrl ? '#14b8a6' : '#334155'}`,
              backgroundColor: '#0f172a'
            }}
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 size={36} className="animate-spin" style={{ color: '#14b8a6' }} />
                <p className="text-gray-400 text-sm">Uploading...</p>
              </div>
            ) : previewUrl ? (
              <img
                src={previewUrl}
                alt="3D view preview"
                className="mx-auto rounded-xl object-contain"
                style={{ maxHeight: '220px', maxWidth: '100%' }}
              />
            ) : file && !previewUrl ? (
              <div className="flex flex-col items-center gap-3">
                <FileText size={36} style={{ color: '#14b8a6' }} />
                <p className="text-white text-sm font-medium">{file.name}</p>
                <p className="text-gray-500 text-xs">PDF uploaded</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Upload size={36} style={{ color: '#475569' }} />
                <div>
                  <p className="text-white font-medium">Upload your 3D building view</p>
                  <p className="text-gray-500 text-sm mt-1">PNG, JPG, JPEG or PDF</p>
                  <p className="text-xs mt-1" style={{ color: '#475569' }}>
                    Black & white 3D views and sketches work best
                  </p>
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
            <div className="flex items-center gap-2 mt-2">
              <CheckCircle size={13} style={{ color: '#14b8a6' }} />
              <span className="text-xs" style={{ color: '#14b8a6' }}>File ready — presets selected below</span>
            </div>
          )}
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
            <div className="rounded-2xl overflow-hidden mb-3" style={{ border: '1px solid rgba(20,184,166,0.35)' }}>
              <img src={renderedImage} alt="AI Architectural Render" className="w-full block" />
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
          </div>
        )}
      </div>
    </div>
  );
}
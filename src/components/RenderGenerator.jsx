import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';

export default function RenderGenerator({ projectName = "New Project", rawLayoutData = { valid: true } }) {
  const [perspective, setPerspective] = useState('Isometric');
  const [finish, setFinish] = useState('Photorealistic');
  const [layout, setLayout] = useState('Standard 3D');
  const [status, setStatus] = useState('Draft');
  const [generationId, setGenerationId] = useState(null);
  const [outputImageUrl, setOutputImageUrl] = useState(null);

  useEffect(() => {
    if (!generationId) return;

    const unsubscribe = base44.entities.FloorplanGenerations.subscribe((event) => {
      if (event.type === 'update' && event.data.id === generationId) {
        setStatus(event.data.status);
        if (event.data.output_image_url) {
          setOutputImageUrl(event.data.output_image_url);
        }
      }
    });

    return () => unsubscribe();
  }, [generationId]);

  const handleGenerate = async (overrideFinish) => {
    try {
      const currentFinish = overrideFinish || finish;
      if (overrideFinish) {
        setFinish(overrideFinish);
      }

      // Create a new FloorplanGenerations record
      const record = await base44.entities.FloorplanGenerations.create({
        project_name: projectName,
        raw_layout_data: rawLayoutData,
        ui_style_selection: perspective,
        ui_finish_selection: currentFinish,
        ui_layout_selection: layout,
        status: 'Draft'
      });

      setGenerationId(record.id);
      setStatus('Draft');
      setOutputImageUrl(null);

      // Pass 1: Compile Prompt
      await base44.functions.invoke('compileFloorplanPrompt', { generation_id: record.id });

      // Pass 2: Execute Rendering Pipeline
      // Note: this handles the structural validation and triggers external API
      base44.functions.invoke('executeRenderingPipeline', { generation_id: record.id }).catch(console.error);

    } catch (error) {
      console.error("Error generating floorplan:", error);
    }
  };

  const isLoading = status === 'Structure_Passed' || status === 'Aesthetic_Rendering' || status === 'Error_Retrying';
  const isFailed = status === 'Failed';

  return (
    <div className="flex flex-col md:flex-row gap-8 w-full max-w-5xl mx-auto p-6 bg-slate-900 rounded-xl border border-white/10">
      
      {/* Rendering Preferences Sidebar */}
      <div className="w-full md:w-80 flex flex-col gap-6 p-6 bg-slate-950 rounded-lg border border-white/5 h-fit">
        <h3 className="text-lg font-semibold text-white">Rendering Preferences</h3>
        
        <div className="flex flex-col gap-3">
          <Label className="text-slate-300">Camera Perspective</Label>
          <Select value={perspective} onValueChange={setPerspective} disabled={isLoading}>
            <SelectTrigger className="bg-slate-800 border-white/10 text-white" aria-label="Camera Perspective">
              <SelectValue placeholder="Select perspective" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-white/10">
              <SelectItem value="Isometric" className="text-white">Isometric</SelectItem>
              <SelectItem value="Top-Down" className="text-white">Top-Down</SelectItem>
              <SelectItem value="Cut-Away" className="text-white">Cut-Away</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-3">
          <Label className="text-slate-300">Visual Finish</Label>
          <Select value={finish} onValueChange={setFinish} disabled={isLoading}>
            <SelectTrigger className="bg-slate-800 border-white/10 text-white" aria-label="Visual Finish">
              <SelectValue placeholder="Select finish" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-white/10">
              <SelectItem value="Photorealistic" className="text-white">Photorealistic</SelectItem>
              <SelectItem value="Clay Model" className="text-white">Clay Model</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-3">
          <Label className="text-slate-300">Layout Mode</Label>
          <Select value={layout} onValueChange={setLayout} disabled={isLoading}>
            <SelectTrigger className="bg-slate-800 border-white/10 text-white" aria-label="Layout Mode">
              <SelectValue placeholder="Select layout" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-white/10">
              <SelectItem value="Standard 3D" className="text-white">Standard 3D</SelectItem>
              <SelectItem value="Hybrid 2D/3D" className="text-white">Hybrid 2D/3D</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4">
          <Button 
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-6"
            onClick={() => handleGenerate()}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                <span className="whitespace-normal text-left text-xs leading-tight">Applying Textures & Shadows<br/>(May take up to 60 seconds)...</span>
              </>
            ) : (
              "Generate Marketing Floorplan"
            )}
          </Button>
        </div>
      </div>

      {/* Main Content Area (Preview / Errors) */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] bg-slate-950 rounded-lg border border-white/5 p-6">
        
        {isFailed && (
          <Alert variant="destructive" className="bg-red-950 border-red-900/50 mb-6 cursor-pointer hover:bg-red-900 transition-colors" onClick={() => handleGenerate('Clay Model')}>
            <AlertCircle className="h-5 w-5" />
            <AlertTitle>Rendering Failed</AlertTitle>
            <AlertDescription className="text-red-200 mt-2">
              We couldn't render your 3D textures. Click here to try rendering with a standard Clay Model instead.
            </AlertDescription>
          </Alert>
        )}

        {outputImageUrl ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4">
            <img loading="lazy" decoding="async" src={outputImageUrl} alt="Generated Floorplan" className="max-w-full max-h-[600px] object-contain rounded-md shadow-2xl border border-white/10" />
            <a href={outputImageUrl} target="_blank" rel="noreferrer" className="text-cyan-400 hover:text-cyan-300 text-sm underline">
              View Full Resolution
            </a>
          </div>
        ) : (
          <div className="text-center text-slate-500">
            {isLoading ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-cyan-500" />
                <p>Generating your masterpiece...</p>
                <p className="text-xs opacity-50">Current Status: {status}</p>
              </div>
            ) : (
              <p>Configure your preferences and click Generate to see your 3D floorplan here.</p>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
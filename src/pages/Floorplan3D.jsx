import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Loader2, Box } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PalladioGate from '@/components/PalladioGate';

export default function Floorplan3D() {
  const location = useLocation();
  const rawLayoutData = location.state?.layoutData || { valid: true };

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

      const record = await base44.entities.FloorplanGenerations.create({
        project_name: "Floorplan Render",
        raw_layout_data: rawLayoutData,
        ui_style_selection: perspective,
        ui_finish_selection: currentFinish,
        ui_layout_selection: layout,
        status: 'Draft'
      });

      setGenerationId(record.id);
      setStatus('Draft');
      setOutputImageUrl(null);

      await base44.functions.invoke('compileFloorplanPrompt', { generation_id: record.id });
      base44.functions.invoke('executeRenderingPipeline', { generation_id: record.id }).catch(console.error);

    } catch (error) {
      console.error("Error generating floorplan:", error);
    }
  };

  const isLoading = status === 'Structure_Passed' || status === 'Aesthetic_Rendering' || status === 'Error_Retrying';
  const isFailed = status === 'Failed';

  return (
    <PalladioGate>
      <style dangerouslySetInnerHTML={{__html: `
        /* Base Layout: Desktop First Setup */
        .b44-sidebar-generator {
          background: #0d0f12;
          border-right: 1px solid #1f242c;
          padding: 24px;
          width: 320px;
          height: 100vh;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #f3f4f6;
          position: relative;
          z-index: 50;
        }

        /* Base Elements (Shared Desktop/Mobile) */
        .b44-sidebar-title { font-size: 16px; font-weight: 600; letter-spacing: -0.02em; color: #ffffff; margin-bottom: 24px; display: flex; align-items: center; gap: 8px;}
        .b44-input-group { margin-bottom: 20px; display: flex; flex-direction: column; gap: 8px; }
        .b44-input-group label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; }

        .b44-sidebar-generator select {
          width: 100%; height: 44px; padding: 0 12px; background: #161920; border: 1px solid #2a313d; border-radius: 8px; font-size: 14px; color: #e5e7eb; cursor: pointer; transition: all 0.2s; appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 14px center; background-size: 16px;
        }
        .b44-sidebar-generator select:hover { background-color: #1c2029; border-color: #3b82f6; }
        .b44-sidebar-generator select:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15); }

        .b44-btn-generate { width: 100%; height: 48px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border: none; border-radius: 8px; font-size: 14px; font-weight: 600; color: #ffffff; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 12px rgba(29, 78, 216, 0.3); transition: all 0.2s; margin-top: 12px; -webkit-tap-highlight-color: transparent; }
        .b44-btn-generate:hover { filter: brightness(1.1); }
        .b44-btn-generate:active { transform: scale(0.98); }

        /* Loading & Error States */
        .b44-btn-generate.is-loading { background: #1f242c !important; border: 1px solid #2a313d; color: #9ca3af; cursor: not-allowed; box-shadow: none; position: relative; overflow: hidden; }
        .b44-btn-generate.is-loading::after { content: ""; position: absolute; top: 0; right: 0; bottom: 0; left: 0; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent); transform: translateX(-100%); animation: b44-shimmer 1.5s infinite; }
        @keyframes b44-shimmer { 100% { transform: translateX(100%); } }
        .b44-alert-error { background: rgba(239, 68, 68, 0.06); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; padding: 12px 14px; margin-top: 16px; display: flex; flex-direction: column; gap: 6px; cursor: pointer; transition: all 0.2s;}
        .b44-alert-error:hover { background: rgba(239, 68, 68, 0.1); }
        .b44-alert-error p { margin: 0; font-size: 12px; line-height: 1.4; color: #fca5a5; }
        .b44-alert-error a { font-size: 11px; font-weight: 600; color: #f87171; text-decoration: none; width: max-content; border-bottom: 1px dashed rgba(248, 113, 113, 0.5); }

        /* Mobile CSS Overrides (Screens smaller than 768px) */
        @media (max-width: 767px) {
          .b44-sidebar-generator {
            width: 100%;
            height: auto;
            background: #0d0f12;
            border-right: none;
            border-top: 1px solid #1f242c;
            padding: 24px 20px 120px 20px; /* Extra bottom padding for mobile nav */
            box-shadow: none;
          }
          
          .b44-main-content {
            padding-bottom: 32px !important;
          }

          .b44-sidebar-title {
            font-size: 15px;
            margin-bottom: 16px;
            text-align: center;
            justify-content: center;
          }

          .b44-input-group {
            margin-bottom: 14px;
          }

          /* Optimise dropdown font sizes for iOS safari to prevent auto-zoom bug */
          .b44-sidebar-generator select {
            font-size: 16px; 
            height: 48px;
          }
        }
      `}} />

      <div className="flex flex-col md:flex-row min-h-[calc(100vh-64px)] bg-[#0a0a14] overflow-y-auto md:overflow-hidden relative">
        {/* Sidebar */}
        <div className="b44-sidebar-generator order-2 md:order-1">
          <div className="b44-sidebar-title">
            <Link to="/PalladioFloorplan" className="text-white hover:text-cyan-400 mr-2 flex items-center justify-center p-1 rounded hover:bg-white/10 transition-colors">
              <ArrowLeft size={18} />
            </Link>
            Rendering Preferences
          </div>

          <div className="b44-input-group">
            <label>Camera Perspective</label>
            <select value={perspective} onChange={(e) => setPerspective(e.target.value)} disabled={isLoading}>
              <option value="Isometric">Isometric</option>
              <option value="Top-Down">Top-Down</option>
              <option value="Cut-Away">Cut-Away</option>
            </select>
          </div>

          <div className="b44-input-group">
            <label>Visual Finish</label>
            <select value={finish} onChange={(e) => setFinish(e.target.value)} disabled={isLoading}>
              <option value="Photorealistic">Photorealistic</option>
              <option value="Clay Model">Clay Model</option>
            </select>
          </div>

          <div className="b44-input-group">
            <label>Layout Mode</label>
            <select value={layout} onChange={(e) => setLayout(e.target.value)} disabled={isLoading}>
              <option value="Standard 3D">Standard 3D</option>
              <option value="Hybrid 2D/3D">Hybrid 2D/3D</option>
            </select>
          </div>

          <button 
            className={`b44-btn-generate ${isLoading ? 'is-loading' : ''}`}
            onClick={() => handleGenerate()}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                <span style={{ fontSize: '11px', textAlign: 'left', lineHeight: '1.2' }}>Applying Textures & Shadows<br/>(May take up to 60 seconds)...</span>
              </>
            ) : (
              "Generate Marketing Floorplan"
            )}
          </button>

          {isFailed && (
            <div className="b44-alert-error" onClick={() => handleGenerate('Clay Model')}>
              <p>We couldn't render your 3D textures. Click here to try rendering with a standard Clay Model instead.</p>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-y-auto b44-main-content order-1 md:order-2">
          {outputImageUrl ? (
            <div className="flex flex-col items-center justify-center gap-4 w-full max-w-4xl animate-in fade-in zoom-in duration-500">
              <img src={outputImageUrl} alt="Generated Floorplan" className="w-full h-auto object-contain rounded-xl shadow-2xl border border-white/10 max-h-[80vh]" />
              <a href={outputImageUrl} target="_blank" rel="noreferrer" className="text-cyan-400 hover:text-cyan-300 text-sm underline mt-2">
                View Full Resolution
              </a>
            </div>
          ) : (
            <div className="text-center text-slate-500 max-w-lg">
              {isLoading ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-12 w-12 animate-spin text-cyan-500" />
                  <p className="text-lg text-slate-300 font-medium">Generating your masterpiece...</p>
                  <p className="text-sm opacity-60 bg-slate-800/50 px-3 py-1 rounded-full border border-white/10">Current Status: {status.replace('_', ' ')}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 bg-slate-900/50 p-10 rounded-2xl border border-white/5 border-dashed">
                  <div className="w-full max-w-[280px] rounded-xl bg-slate-800/50 flex items-center justify-center mb-2 aspect-video overflow-hidden border border-white/5">
                    {/* Placeholder image resembling a 3D floorplan layout */}
                    <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=600&auto=format&fit=crop" alt="3D Floorplan preview" className="w-full h-full object-cover opacity-60 mix-blend-luminosity" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-200">Ready to Render</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Configure your perspective, finish, and layout preferences in the sidebar. Once ready, click "Generate" to transform your floorplan data into a beautiful 3D asset.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </PalladioGate>
  );
}
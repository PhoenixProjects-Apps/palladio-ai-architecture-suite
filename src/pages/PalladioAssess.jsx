import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Upload, Loader2, FileImage, AlertCircle, Layers, Building, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import ReactMarkdown from 'react-markdown';
import PalladioGate from '@/components/PalladioGate';
import SaveToProject from '@/components/SaveToProject';
import ProjectDetailsForm from '@/components/ProjectDetailsForm';
import ChooseProject from '@/components/ChooseProject';
import { exportAssessmentToPdf } from '@/lib/exportPdf';
import { toast } from 'sonner';

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

function buildProjectInfoCard(pi) {
  if (!pi) return null;
  const rows = [
    pi.project_name && { label: 'Project', value: pi.project_name },
    pi.client_name && { label: 'Client', value: pi.client_name },
    pi.address && { label: 'Address', value: pi.address },
    pi.lot_no && { label: 'Lot No.', value: pi.lot_no },
    pi.rp_no && { label: 'RP No.', value: pi.rp_no },
    pi.site_area && { label: 'Site Area', value: pi.site_area },
    pi.council_overlays && { label: 'Council Overlays', value: pi.council_overlays },
  ].filter(Boolean);
  return rows.length ? rows : null;
}

export default function PalladioAssess() {
  const { setCredits } = useAuth();
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [projectDetails, setProjectDetails] = useState({
    projectName: '', clientName: '', address: '', lotNo: '', rpNo: '', siteArea: '', councilOverlays: '', projectId: null
  });
  const [reviewTier, setReviewTier] = useState('concept');
  const fileInputRef = useRef(null);

  // Secure Direct Upload to Firebase
  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (selectedFile.size > 20 * 1024 * 1024) {
      toast.error("File is too large. Please upload a file smaller than 20MB.");
      return;
    }

    setFile(selectedFile);
    setResult(null);
    setUploadError(null);
    setPreviewUrl(selectedFile.type.startsWith('image/') ? URL.createObjectURL(selectedFile) : null);
    setIsUploading(true);

    try {
      const authRes = await base44.functions.invoke('getUploadUrl', {
        fileName: selectedFile.name,
        fileType: selectedFile.type
      });
      
      const { uploadUrl, file_url } = authRes.data || {};
      if (!uploadUrl || !file_url) throw new Error('Could not secure upload permission');

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: selectedFile,
        headers: { 'Content-Type': selectedFile.type },
      });

      if (!uploadRes.ok) throw new Error('Direct upload failed');
      setFileUrl(file_url);
    } catch (err) {
      console.error(err);
      setUploadError("Failed to upload file. Please try again.");
      toast.error("Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!fileUrl) return toast.error("Please wait for the file to finish uploading.");

    setIsAnalyzing(true);
    setResult(null);

    try {
      const tokenRes = await base44.functions.invoke('consumeToken', { amount: 1 });
      if (tokenRes.data?.error) {
        toast.error(tokenRes.data.error || "Not enough AI tokens.");
        setIsAnalyzing(false);
        return;
      }
      if (tokenRes.data?.tokens !== undefined) setCredits(tokenRes.data.tokens);

      // Call the synchronous assessment task
      const runRes = await base44.functions.invoke('runPlanAssessment', {
        action: 'run',
        fileUrl: fileUrl,
        tier: reviewTier,
        projectDetails
      });
      
      if (runRes.data?.error) throw new Error(runRes.data.error);
      if (!runRes.data?.output) throw new Error("No output received from the assessment.");

      setResult(runRes.data.output);

      if (projectDetails.projectId) {
        toast.success("Assessment complete! Ready to save.");
      }
    } catch (err) {
      console.error(err);
      toast.error("The assessment could not be completed.");
      setResult("An error occurred during analysis. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExportPdf = async () => {
    if (typeof result !== 'object') return toast.error('Nothing to export');
    setExporting(true);
    try {
      exportAssessmentToPdf(result, reviewTier);
    } catch (e) {
      toast.error('Could not generate PDF');
    } finally {
      setExporting(false);
    }
  };

  const formValid = projectDetails.projectName.trim() && projectDetails.clientName.trim() && projectDetails.address.trim();
  const piRows = result && typeof result === 'object' ? buildProjectInfoCard(result.project_info) : null;

  return (
    <PalladioGate>
      <div className="min-h-screen bg-[#0f1117] text-white p-4 sm:p-6 pb-12">
        <div className="max-w-3xl mx-auto">
          <header className="flex items-center gap-4 mb-8 border-b border-white/10 pb-4">
            <Link to={createPageUrl('Home')}>
              <Button variant="ghost" size="icon" className="hover:bg-white/10 rounded-full">
                <ArrowLeft size={20} />
              </Button>
            </Link>
            <div className="w-10 min-h-11 h-auto rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-700 flex items-center justify-center shadow-lg">
              <FileImage size={20} />
            </div>
            <h1 className="font-bold text-xl">Assess Plans</h1>
          </header>

          {!result ? (
            isAnalyzing ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-12 shadow-md flex flex-col items-center justify-center">
                <Loader2 size={40} className="animate-spin text-cyan-500 mb-4" />
                <p className="text-slate-300 font-medium">Running superagent assessment...</p>
                <p className="text-slate-500 text-sm mt-1">Analysing plan components and compliance</p>
              </div>
            ) : (
              <div className="space-y-6">
                <ChooseProject
                  selected={projectDetails.projectId ? { id: projectDetails.projectId, name: projectDetails.projectName } : null}
                  onSelect={(p) => setProjectDetails((prev) => ({ ...prev, projectId: p.id, projectName: p.name }))}
                  className="w-full border-cyan-600/50 text-cyan-300 hover:bg-cyan-500/10 h-12 rounded-xl"
                />
                <ProjectDetailsForm
                  value={projectDetails}
                  onChange={(patch) => setProjectDetails((prev) => ({ ...prev, ...patch }))}
                />

                <div className="bg-white/5 border border-white/10 rounded-2xl p-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewTier('concept')}
                    className={`flex-1 flex flex-col items-center justify-center py-3 rounded-xl font-medium transition-all ${reviewTier === 'concept' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                  >
                    <div className="flex items-center gap-1 opacity-80 text-xs mb-0.5">
                      <Layers size={14} />
                      <span>Phase 1:</span>
                    </div>
                    <span className="text-base font-semibold">Concept</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewTier('construction')}
                    className={`flex-1 flex flex-col items-center justify-center py-3 rounded-xl font-medium transition-all ${reviewTier === 'construction' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                  >
                    <div className="flex items-center gap-1 opacity-80 text-xs mb-0.5">
                      <AlertCircle size={14} />
                      <span>Phase 2:</span>
                    </div>
                    <span className="text-base font-semibold">Construction</span>
                  </button>
                </div>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-white/10 hover:border-cyan-500/50 rounded-3xl p-12 text-center cursor-pointer transition-colors bg-white/5"
                >
                  {isUploading ? (
                    <div className="flex flex-col items-center">
                      <Loader2 size={40} className="animate-spin text-cyan-500 mb-4" />
                      <p className="text-slate-400">Uploading document...</p>
                    </div>
                  ) : previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="mx-auto max-h-[300px] rounded-xl object-contain shadow-lg" />
                  ) : file ? (
                    <div className="flex flex-col items-center">
                      <FileImage size={48} className="text-cyan-500 mb-4" />
                      <p className="text-white font-medium">{file.name}</p>
                      <p className="text-slate-400 text-sm mt-1">
                        PDF Document ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <Upload size={48} className="text-slate-500 mb-4" />
                      <p className="text-lg font-medium text-white mb-2">Upload floorplans or drawings</p>
                      <p className="text-slate-400 text-sm">Drag and drop, or click to browse (Images, PDF)</p>
                    </div>
                  )}
                  <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,.pdf" className="hidden" />
                </div>

                {uploadError && (
                  <div className="text-red-400 text-sm text-center bg-red-400/10 py-3 rounded-lg border border-red-400/20">
                    <AlertCircle className="inline-block w-4 h-4 mr-2 mb-0.5" />
                    {uploadError}
                  </div>
                )}

                <Button
                  onClick={handleAnalyze}
                  disabled={!file || isUploading || isAnalyzing || !formValid}
                  className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-6 text-lg rounded-xl shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAnalyzing ? (
                    <><Loader2 size={20} className="animate-spin mr-2" /> Auditing Blueprint Components...</>
                  ) : (
                    `Run ${reviewTier === 'concept' ? 'Concept' : 'Construction'} Assessment`
                  )}
                </Button>
                {!formValid && file && (
                  <p className="text-xs text-slate-500 text-center -mt-3">Fill in the project details above to enable the assessment.</p>
                )}
              </div>
            )
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {typeof result === 'object' ? (
                <>
                  {piRows && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-md">
                      <h3 className="text-cyan-400 font-semibold mb-3 flex items-center gap-2"><Building size={18} /> Project Information</h3>
                      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                        {piRows.map((r, i) => (
                          <div key={i} className="flex gap-2">
                            <span className="text-slate-500 min-w-[120px]">{r.label}</span>
                            <span className="text-slate-200">{r.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-2xl p-6 shadow-lg md:col-span-2">
                      <h3 className="text-cyan-400 font-semibold mb-2 text-lg">{result.plan_type || 'Plan Assessment'}</h3>
                      <p className="text-slate-200 leading-relaxed">{result.overview}</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-lg flex flex-col items-center justify-center text-center">
                      <p className="text-slate-400 text-sm mb-2">Overall Score</p>
                      <div className="text-5xl font-bold text-cyan-400">{result.overall_score}<span className="text-2xl text-slate-500">/10</span></div>
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-md">
                    <h3 className="text-cyan-400 font-semibold mb-3">Spatial Analysis</h3>
                    <p className="text-slate-300 leading-relaxed">{result.spatial_analysis}</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-md">
                      <h3 className="text-cyan-400 font-semibold mb-4">Design Observations</h3>
                      <ul className="space-y-3">
                        {result.design_observations?.map((obs, i) => (
                          <li key={i} className="flex gap-3 text-slate-300 text-sm">
                            <span className="text-cyan-500 mt-0.5">•</span>
                            <span>{obs}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-6">
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 shadow-md">
                        <h3 className="text-amber-400 font-semibold mb-4 flex items-center gap-2">
                          <AlertCircle size={18} /> Compliance & Flags
                        </h3>
                        <ul className="space-y-3">
                          {result.compliance_flags?.map((flag, i) => (
                            <li key={i} className="flex gap-3 text-amber-200 text-sm">
                              <span className="text-amber-500 mt-0.5">•</span>
                              <span>{flag}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 shadow-md">
                        <h3 className="text-emerald-400 font-semibold mb-4">Recommendations</h3>
                        <ul className="space-y-3">
                          {result.recommendations?.map((rec, i) => (
                            <li key={i} className="flex gap-3 text-emerald-200 text-sm">
                              <span className="text-emerald-500 mt-0.5">•</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 prose prose-invert max-w-none prose-headings:text-cyan-400 prose-a:text-cyan-400 shadow-xl">
                  <ReactMarkdown>{result}</ReactMarkdown>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <SaveToProject
                  textContent={
                    typeof result === 'object'
                      ? `# Plan Assessment: ${result.plan_type || ''}\n\n**Overall Score:** ${result.overall_score}/10\n\n${piRows ? `## Project Information\n${piRows.map((r) => `- **${r.label}:** ${r.value}`).join('\n')}\n\n` : ''}## Overview\n${result.overview}\n\n## Spatial Analysis\n${result.spatial_analysis}\n\n## Design Observations\n${(result.design_observations || []).map((o) => `- ${o}`).join('\n')}\n\n## Compliance Flags\n${(result.compliance_flags || []).map((f) => `- ${f}`).join('\n')}\n\n## Recommendations\n${(result.recommendations || []).map((r) => `- ${r}`).join('\n')}`
                      : String(result)
                  }
                  fileName={`${reviewTier}-assessment.md`}
                  assetType="document"
                  className="w-full sm:flex-1 rounded-xl border-teal-600/50 text-teal-400 hover:bg-teal-500/10 hover:text-teal-300 h-12"
                />
                <Button
                  onClick={handleExportPdf}
                  disabled={exporting}
                  className="w-full sm:flex-1 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white h-12"
                >
                  {exporting ? <Loader2 size={16} className="animate-spin mr-2" /> : <Download size={16} className="mr-2" />}
                  Download PDF
                </Button>
                <Button
                  onClick={() => { setResult(null); setFile(null); setFileUrl(null); setPreviewUrl(null); }}
                  variant="outline"
                  className="w-full sm:flex-1 rounded-xl border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white h-12"
                >
                  Analyse Another Plan
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </PalladioGate>
  );
}
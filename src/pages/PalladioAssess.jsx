import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Upload, Loader2, FileImage, AlertCircle, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import ReactMarkdown from 'react-markdown';
import PalladioGate from '@/components/PalladioGate';
import SaveToProject from '@/components/SaveToProject';
import { toast } from 'sonner';

export default function PalladioAssess() {
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [reviewTier, setReviewTier] = useState('concept'); 
  const fileInputRef = useRef(null);

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

    if (selectedFile.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(selectedFile));
    } else {
      setPreviewUrl(null);
    }

    setIsUploading(true);
    try {
      const res = await base44.integrations.Core.UploadFile({ file: selectedFile });
      setFileUrl(res.file_url || res.url);
    } catch (err) {
      console.error(err);
      let errMsg = "Failed to upload file. Please try again.";
      if (err?.message?.includes("Network Error")) {
        errMsg = "Network Error: The file might be too large or your connection was interrupted.";
      }
      setUploadError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsUploading(false);
    }
  };

  // Helper utility to introduce an asynchronous pause/sleep state
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const handleAnalyze = async () => {
    if (!file) return;
    if (!fileUrl) {
      toast.error("Please wait for the file to finish uploading.");
      return;
    }
    
    setIsAnalyzing(true);
    
    try {
      // Consume token check
      const tokenRes = await base44.functions.invoke('consumeToken', {});
      if (tokenRes.data?.error) {
        toast.error("You don't have enough AI tokens. Please upgrade your plan.");
        setIsAnalyzing(false);
        return;
      }

      // Defensive Layer 1: Short delay to allow the uploaded storage asset to 'settle' globally
      await delay(1500);

      let response = null;
      let attempts = 0;
      const maxRetries = 3;
      let success = false;

      // Defensive Layer 2: Retry loop with Exponential Backoff
      while (attempts < maxRetries && !success) {
        try {
          attempts++;
          
          response = await base44.functions.invoke('runPlanAssessment', {
            fileUrl: fileUrl,
            tier: reviewTier
          });

          // Check if the server explicitly complained about the attachment link
          const errDetails = response.data?.details || "";
          if (response.data?.error && (errDetails.includes("Invalid file attachment") || errDetails.includes("400"))) {
            throw new Error("RETRY_TRIGGER: Attachment propagation delay caught.");
          }

          success = true; // No errors thrown, we are clear!
        } catch (loopError) {
          console.warn(`Analysis attempt ${attempts} failed. Checking file availability...`);
          
          if (attempts >= maxRetries) {
            throw new Error("MAX_RETRIES_REACHED: The storage file is taking too long to authorize.");
          }
          
          // Wait longer on each successive failure (e.g., 2s, then 4s)
          await delay(attempts * 2000); 
        }
      }

      // Process and commit the validated payload data
      if (response && response.data?.assessmentReport) {
        const finalReport = response.data.assessmentReport;
        setResult(finalReport);
        
        const markdownString = `
# Plan Assessment: ${finalReport.plan_type || 'Architectural Sheet'}
**Overall Score:** ${finalReport.overall_score}/10
**Assessment Tier:** ${reviewTier === 'concept' ? 'Tier 1 (Concept)' : 'Tier 2 (Construction)'}

## Overview
${finalReport.overview}

## Spatial Analysis
${finalReport.spatial_analysis}

## Design Observations
${(finalReport.design_observations || []).map(o => `- ${o}`).join('\n')}

## Compliance Flags
${(finalReport.compliance_flags || []).map(f => `- ${f}`).join('\n')}

## Recommendations
${(finalReport.recommendations || []).map(r => `- ${r}`).join('\n')}
        `.trim();

        await base44.functions.invoke('saveToDrive', {
          fileUrl: fileUrl,
          assessmentReport: markdownString,
          tier: reviewTier
        });
        
        toast.success("Assessment complete and saved successfully!");
      } else {
        throw new Error("Failed to receive structured report payload.");
      }

    } catch (err) {
      console.error("Final Analysis Failure Chain:", err);
      setResult("An error occurred during analysis. Please try again.");
      toast.error("The document file could not be read by the AI engine. Please re-upload or try again in a moment.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <PalladioGate>
      <div className="min-h-screen bg-[#0f1117] text-white p-6">
        <div className="max-w-3xl mx-auto">
          <header className="flex items-center gap-4 mb-8 border-b border-white/10 pb-4">
            <Link to={createPageUrl('Home')}>
              <Button variant="ghost" size="icon" className="hover:bg-white/10 rounded-full">
                <ArrowLeft size={20} />
              </Button>
            </Link>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-700 flex items-center justify-center shadow-lg">
              <FileImage size={20} />
            </div>
            <h1 className="font-bold text-xl">Assess Plans</h1>
          </header>

          {!result ? (
            <div className="space-y-6">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setReviewTier('concept')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-all ${reviewTier === 'concept' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                  <Layers size={16} />
                  Tier 1: Concept & Pricing
                </button>
                <button
                  type="button"
                  onClick={() => setReviewTier('construction')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-all ${reviewTier === 'construction' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                  <AlertCircle size={16} />
                  Tier 2: Construction Audit
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
                disabled={!file || isUploading || isAnalyzing}
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-6 text-lg rounded-xl shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAnalyzing ? (
                  <><Loader2 size={20} className="animate-spin mr-2" /> Auditing Blueprint Components...</>
                ) : (
                  `Run ${reviewTier === 'concept' ? 'Concept' : 'Construction'} Assessment`
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {typeof result === 'object' ? (
                <>
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
                      ? `# Plan Assessment: ${result.plan_type || ''}\n\n**Overall Score:** ${result.overall_score}/10\n\n## Overview\n${result.overview}\n\n## Spatial Analysis\n${result.spatial_analysis}\n\n## Design Observations\n${(result.design_observations || []).map((o) => `- ${o}`).join('\n')}\n\n## Compliance Flags\n${(result.compliance_flags || []).map((f) => `- ${f}`).join('\n')}\n\n## Recommendations\n${(result.recommendations || []).map((r) => `- ${r}`).join('\n')}` 
                      : String(result)
                  }
                  fileName={`${reviewTier}-assessment.md`}
                  assetType="document"
                  className="w-full sm:flex-1 rounded-xl border-teal-600/50 text-teal-400 hover:bg-teal-500/10 hover:text-teal-300 h-12"
                />
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
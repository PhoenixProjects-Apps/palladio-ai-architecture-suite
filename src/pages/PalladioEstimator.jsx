import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Upload, Loader2, Calculator, Database, FileText, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const SITE_DIFFICULTY_RATES = {
  'Level / Standard': 0,
  'Sloping / Moderate': 10,
  'Steep / Difficult': 20,
  'Extreme / Restricted Access': 30
};

export default function PalladioEstimator() {
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [state, setState] = useState('NSW');
  const [city, setCity] = useState('Sydney');
  const [storeys, setStoreys] = useState('1');
  const [difficulty, setDifficulty] = useState('Level / Standard');
  
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setResult(null);

    if (selectedFile.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(selectedFile));
    } else {
      setPreviewUrl(null);
    }

    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: selectedFile });
      setFileUrl(file_url);
    } catch(err) {
      toast.error('Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!fileUrl) return;
    setIsAnalyzing(true);
    
    try {
      const tokenRes = await base44.functions.invoke('consumeToken', {});
      if (tokenRes.data?.error) {
          toast.error("You don't have enough AI tokens. Please upgrade your plan.");
          setIsAnalyzing(false);
          return;
      }
      const allCosts = await base44.entities.MaterialCost.list();
      const localCosts = allCosts.filter(c => c.state === state);
      
      const markup = SITE_DIFFICULTY_RATES[difficulty];
      
      const prompt = `You are an expert Australian Quantity Surveyor. Analyze the provided architectural floor plan or render.
Calculate the estimated material quantities and costs. Use square metres (sqm) for areas and millimetres (mm) for lengths.
Site details:
- State: ${state}, City: ${city}
- Storeys: ${storeys}
- Site Difficulty: ${difficulty} (Apply a ${markup}% markup to the subtotal as 'site_difficulty_markup_cost')

Available Cost Database for this region:
${JSON.stringify(localCosts)}

INSTRUCTIONS:
1. Identify all key materials and structural elements needed for this building.
2. Estimate quantities based on standard Australian building sizes if scale is not clear.
3. Cross-reference the required materials with the provided cost database. If a material is missing from the database, estimate it based on current Australian market rates.
4. If Storeys >= 2, you MUST include 'Scaffolding' as a line item.
5. Calculate the subtotal, the site difficulty markup cost (${markup}% of subtotal), and the grand total.
6. Provide a list of assumptions made during the takeoff.`;

      const responseSchema = {
          type: "object",
          properties: {
              line_items: {
                  type: "array",
                  items: {
                      type: "object",
                      properties: {
                          category: { type: "string" },
                          item_name: { type: "string" },
                          quantity: { type: "number" },
                          unit: { type: "string" },
                          unit_cost: { type: "number" },
                          total_cost: { type: "number" }
                      },
                      required: ["category", "item_name", "quantity", "unit", "unit_cost", "total_cost"]
                  }
              },
              subtotal: { type: "number" },
              scaffolding_included: { type: "boolean" },
              site_difficulty_markup_cost: { type: "number" },
              grand_total: { type: "number" },
              assumptions: { type: "array", items: { type: "string" } }
          },
          required: ["line_items", "subtotal", "scaffolding_included", "site_difficulty_markup_cost", "grand_total", "assumptions"]
      };

      const res = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        file_urls: [fileUrl],
        response_json_schema: responseSchema
      });
      
      setResult(res);
      toast.success("Cost estimate generated successfully");
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate estimate');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatCurrency = (val) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(val);

  return (
    <div className="min-h-screen bg-[#0f1117] text-white p-6 pb-12">
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-4">
                    <Link to={createPageUrl('Home')}>
                        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl">
                            <ArrowLeft size={20} />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Calculator className="text-blue-500" />
                            AI Cost Estimator
                        </h1>
                        <p className="text-slate-400 text-sm">Automated takeoffs and material costing.</p>
                    </div>
                </div>
                <Link to={createPageUrl('CostDatabase')}>
                    <Button variant="outline" className="border-slate-700 text-slate-300 hover:text-white bg-slate-800/50">
                        <Database className="w-4 h-4 mr-2" />
                        Manage Cost DB
                    </Button>
                </Link>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <Card className="bg-slate-900 border-slate-800">
                        <CardHeader>
                            <CardTitle className="text-white text-lg">Project Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="text-xs text-slate-400 mb-1 block">State</label>
                                <Select value={state} onValueChange={setState}>
                                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-10"><SelectValue /></SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                                        {['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 mb-1 block">City / Region</label>
                                <Input value={city} onChange={e => setCity(e.target.value)} className="bg-slate-800 border-slate-700 text-white h-10" />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 mb-1 block">Storeys</label>
                                <Select value={storeys} onValueChange={setStoreys}>
                                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-10"><SelectValue /></SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                                        {['1', '2', '3', '4+'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 mb-1 block">Site Difficulty</label>
                                <Select value={difficulty} onValueChange={setDifficulty}>
                                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-10"><SelectValue /></SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                                        {Object.keys(SITE_DIFFICULTY_RATES).map(s => <SelectItem key={s} value={s}>{s} (+{SITE_DIFFICULTY_RATES[s]}%)</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-900 border-slate-800">
                        <CardHeader>
                            <CardTitle className="text-white text-lg">Upload Plan / Render</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col justify-center items-center min-h-[160px]"
                                style={{
                                    border: `2px dashed ${fileUrl ? '#3b82f6' : '#334155'}`,
                                    backgroundColor: '#0f172a'
                                }}
                            >
                                {isUploading ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <Loader2 size={24} className="animate-spin text-blue-500" />
                                        <p className="text-gray-400 text-xs">Uploading...</p>
                                    </div>
                                ) : previewUrl ? (
                                    <img src={previewUrl} alt="preview" className="mx-auto rounded-lg object-contain max-h-[140px]" />
                                ) : file && !previewUrl ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <FileText size={24} className="text-blue-500" />
                                        <p className="text-white text-xs font-medium truncate w-full px-2">{file.name}</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2">
                                        <Upload size={24} className="text-slate-500" />
                                        <div>
                                            <p className="text-white text-sm font-medium">Upload File</p>
                                            <p className="text-slate-500 text-[10px] mt-1">Image or PDF plan</p>
                                        </div>
                                    </div>
                                )}
                                <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleFileSelect} className="hidden" />
                            </div>
                            
                            <Button 
                                onClick={handleAnalyze} 
                                disabled={!fileUrl || isAnalyzing} 
                                className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white h-11"
                            >
                                {isAnalyzing ? <><Loader2 className="animate-spin mr-2" size={18} /> Analyzing...</> : <><Calculator className="mr-2" size={18} /> Generate Estimate</>}
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-2">
                    {result ? (
                        <Card className="bg-slate-900 border-slate-800">
                            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800 pb-4">
                                <div>
                                    <CardTitle className="text-white text-xl">Detailed Estimate</CardTitle>
                                    <CardDescription className="text-slate-400">Based on localized DB and AI takeoff.</CardDescription>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-slate-400">Grand Total</p>
                                    <p className="text-2xl font-bold text-blue-400">{formatCurrency(result.grand_total)}</p>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="overflow-x-auto rounded-xl border border-slate-800 mb-6">
                                    <Table>
                                        <TableHeader className="bg-slate-800/50">
                                            <TableRow className="border-slate-800">
                                                <TableHead className="text-slate-300">Category</TableHead>
                                                <TableHead className="text-slate-300">Item</TableHead>
                                                <TableHead className="text-slate-300 text-right">Qty</TableHead>
                                                <TableHead className="text-slate-300 text-right">Rate</TableHead>
                                                <TableHead className="text-slate-300 text-right">Total</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {result.line_items.map((item, i) => (
                                                <TableRow key={i} className="border-slate-800">
                                                    <TableCell className="text-slate-400 text-sm">{item.category}</TableCell>
                                                    <TableCell className="font-medium text-white">{item.item_name}</TableCell>
                                                    <TableCell className="text-right text-slate-300">{item.quantity} {item.unit}</TableCell>
                                                    <TableCell className="text-right text-slate-300">{formatCurrency(item.unit_cost)}</TableCell>
                                                    <TableCell className="text-right text-white font-medium">{formatCurrency(item.total_cost)}</TableCell>
                                                </TableRow>
                                            ))}
                                            <TableRow className="border-t-2 border-slate-700 bg-slate-800/20">
                                                <TableCell colSpan={4} className="text-right font-medium text-slate-300">Subtotal</TableCell>
                                                <TableCell className="text-right font-bold text-white">{formatCurrency(result.subtotal)}</TableCell>
                                            </TableRow>
                                            {result.site_difficulty_markup_cost > 0 && (
                                                <TableRow className="border-slate-800 bg-amber-900/10">
                                                    <TableCell colSpan={4} className="text-right text-amber-400">
                                                        Site Difficulty Markup ({SITE_DIFFICULTY_RATES[difficulty]}%)
                                                    </TableCell>
                                                    <TableCell className="text-right text-amber-400 font-medium">
                                                        +{formatCurrency(result.site_difficulty_markup_cost)}
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>

                                <div>
                                    <h3 className="text-white font-medium mb-3">AI Assumptions & Notes</h3>
                                    <ul className="list-disc pl-5 space-y-1">
                                        {result.assumptions.map((a, i) => (
                                            <li key={i} className="text-sm text-slate-400">{a}</li>
                                        ))}
                                    </ul>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="h-full border-2 border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center p-12 text-center text-slate-500 min-h-[400px]">
                            <DollarSign size={48} className="mb-4 opacity-20" />
                            <h3 className="text-lg font-medium text-slate-400 mb-2">No Estimate Generated</h3>
                            <p className="max-w-md mx-auto text-sm">Upload a floor plan or render, set your location and site details, and click Generate Estimate to see the cost breakdown here.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
}
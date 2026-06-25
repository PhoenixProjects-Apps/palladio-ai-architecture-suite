import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Upload, Loader2, Calculator, Database, FileText, DollarSign, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import SaveToProject from '@/components/SaveToProject';

const SITE_DIFFICULTY_RATES = {
  'Level / Standard': 0,
  'Sloping / Moderate': 10,
  'Steep / Difficult': 20,
  'Extreme / Restricted Access': 30
};

const CITY_OPTIONS = {
  'NSW': ['Sydney City', 'Outer Suburbs', 'Regional'],
  'VIC': ['Melbourne City', 'Outer Suburbs', 'Regional'],
  'QLD': ['Brisbane', 'Gold Coast', 'Northern QLD', 'Regional'],
  'WA': ['Perth', 'Outer Suburbs', 'Regional'],
  'SA': ['Adelaide', 'Regional'],
  'TAS': ['Hobart', 'Regional'],
  'ACT': ['Canberra'],
  'NT': ['Darwin', 'Regional']
};

// Average construction cost per sqm by city/region (2025 market data)
// Source: ASE Estimation, Matrix Estimating, Altus Group, ABS
const REGIONAL_COST_RATES = {
  'NSW': {
    'Sydney City': { low: 3200, high: 4300, avg: 3750 },
    'Outer Suburbs': { low: 2500, high: 3500, avg: 3000 },
    'Regional': { low: 1900, high: 2800, avg: 2350 }
  },
  'VIC': {
    'Melbourne City': { low: 2700, high: 3800, avg: 3250 },
    'Outer Suburbs': { low: 2000, high: 3000, avg: 2500 },
    'Regional': { low: 1800, high: 2600, avg: 2200 }
  },
  'QLD': {
    'Brisbane': { low: 2400, high: 3500, avg: 2950 },
    'Gold Coast': { low: 2200, high: 3400, avg: 2800 },
    'Northern QLD': { low: 1900, high: 3000, avg: 2450 },
    'Regional': { low: 1700, high: 2700, avg: 2200 }
  },
  'WA': {
    'Perth': { low: 2200, high: 3700, avg: 2950 },
    'Outer Suburbs': { low: 1900, high: 3000, avg: 2450 },
    'Regional': { low: 1700, high: 2600, avg: 2150 }
  },
  'SA': {
    'Adelaide': { low: 1900, high: 2900, avg: 2400 },
    'Regional': { low: 1700, high: 2500, avg: 2100 }
  },
  'TAS': {
    'Hobart': { low: 1900, high: 2900, avg: 2400 },
    'Regional': { low: 1700, high: 2400, avg: 2050 }
  },
  'ACT': {
    'Canberra': { low: 2400, high: 3800, avg: 3100 }
  },
  'NT': {
    'Darwin': { low: 2600, high: 3800, avg: 3200 },
    'Regional': { low: 2200, high: 3200, avg: 2700 }
  }
};

export default function PalladioEstimator() {
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [state, setState] = useState('QLD');
  const [city, setCity] = useState('Gold Coast');
  const [storeys, setStoreys] = useState('1');
  const [difficulty, setDifficulty] = useState('Level / Standard');

  const [result, setResult] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const main = document.querySelector('main');
    if (main) main.scrollTop = 0;
  }, []);

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
    } catch (err) {
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
      const cityCosts = allCosts.filter((c) => c.state === state && c.city === city);
      const localCosts = cityCosts.length > 0 ? cityCosts : allCosts.filter((c) => c.state === state);
      const regionalRate = REGIONAL_COST_RATES[state]?.[city] || { low: 1800, high: 4000, avg: 2900 };

      const markup = SITE_DIFFICULTY_RATES[difficulty];

      const prompt = `You are an expert Australian Quantity Surveyor. Analyze the provided architectural floor plan or render.
Calculate the estimated material quantities and costs. Use square metres (sqm) for areas and millimetres (mm) for lengths.
Site details:
- State: ${state}, City: ${city}
- Storeys: ${storeys}
- Site Difficulty: ${difficulty} (Apply a ${markup}% markup to the subtotal as 'site_difficulty_markup_cost')

Regional baseline construction cost for ${city}, ${state} (2025 market data):
- Low: $${regionalRate.low}/sqm, High: $${regionalRate.high}/sqm, Average: $${regionalRate.avg}/sqm

Available Cost Database for this region:
${JSON.stringify(localCosts)}

INSTRUCTIONS:
1. Identify all key materials and structural elements needed for this building.
2. Estimate quantities based on standard Australian building sizes if scale is not clear.
3. Cross-reference the required materials with the provided cost database. If a material is missing from the database, estimate it based on current Australian market rates.
4. Calibrate all unit costs to align with the regional baseline cost per sqm for ${city}, ${state}. The total of all line items per sqm of building footprint should fall within the $${regionalRate.low}–$${regionalRate.high}/sqm range. Adjust rates up or down from the database defaults to match local market conditions for this specific city/region.
5. If Storeys >= 2, you MUST include 'Scaffolding' as a line item.
6. Calculate the subtotal, the site difficulty markup cost (${markup}% of subtotal), and the grand total.
7. Provide a list of assumptions made during the takeoff.`;

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

  const buildEstimateText = () => {
    if (!result) return '';
    let text = '# Cost Estimate\n\n';
    text += `**Grand Total:** ${formatCurrency(result.grand_total)}\n\n`;
    text += '## Line Items\n\n';
    text += '| Category | Item | Qty | Unit | Rate | Total |\n';
    text += '|----------|------|-----|------|------|-------|\n';
    result.line_items.forEach(item => {
      text += `| ${item.category} | ${item.item_name} | ${item.quantity} | ${item.unit} | ${formatCurrency(item.unit_cost)} | ${formatCurrency(item.total_cost)} |\n`;
    });
    text += `\n**Subtotal:** ${formatCurrency(result.subtotal)}\n`;
    if (result.site_difficulty_markup_cost > 0) {
      text += `**Site Difficulty Markup (${SITE_DIFFICULTY_RATES[difficulty]}%):** +${formatCurrency(result.site_difficulty_markup_cost)}\n`;
    }
    text += `\n## Assumptions\n\n`;
    result.assumptions.forEach(a => { text += `- ${a}\n`; });
    return text;
  };

  const handleDownload = () => {
    if (!result) return;
    const rows = [
      ['Category', 'Item', 'Quantity', 'Unit', 'Unit Cost', 'Total Cost'],
      ...result.line_items.map(item => [item.category, item.item_name, item.quantity, item.unit, item.unit_cost, item.total_cost]),
      ['', '', '', '', 'Subtotal', result.subtotal],
    ];
    if (result.site_difficulty_markup_cost > 0) {
      rows.push(['', '', '', '', `Site Difficulty Markup (${SITE_DIFFICULTY_RATES[difficulty]}%)`, result.site_difficulty_markup_cost]);
    }
    rows.push(['', '', '', '', 'Grand Total', result.grand_total]);
    rows.push([]);
    rows.push(['Assumptions:']);
    result.assumptions.forEach(a => rows.push([a]));
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cost-estimate.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#0f1117] text-white p-6 pb-12">
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col gap-4 border-b border-slate-800 pb-4">
                    <header className="flex items-center gap-4 border-b border-white/10 mb-1">
                    <Link to={createPageUrl('Home')}>
                        <Button variant="ghost" size="icon" className="hover:bg-white/10 rounded-full">
                            <ArrowLeft size={20} />
                        </Button>
                    </Link>
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg">
                            <Calculator size={20} />
                        </div>
                        <h1 className="font-bold text-xl">Cost Estimator</h1>
                    </header>
            <Link to={createPageUrl('CostDatabase')} className="self-start sm:self-end">
                    <Button variant="outline" className="border-slate-700 text-slate-300 hover:text-white bg-slate-800/50">
                        <Database className="w-4 h-4" />
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
                                <Select value={state} onValueChange={(s) => { setState(s); setCity(CITY_OPTIONS[s][0]); }}>
                                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-10"><SelectValue /></SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                                        {['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 mb-1 block">City / Region</label>
                                <Select value={city} onValueChange={setCity}>
                                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-10"><SelectValue /></SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                                        {CITY_OPTIONS[state].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 mb-1 block">Storeys</label>
                                <Select value={storeys} onValueChange={setStoreys}>
                                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-10"><SelectValue /></SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                                        {['1', '2', '3', '4+'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 mb-1 block">Site Difficulty</label>
                                <Select value={difficulty} onValueChange={setDifficulty}>
                                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-10"><SelectValue /></SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                                        {Object.keys(SITE_DIFFICULTY_RATES).map((s) => <SelectItem key={s} value={s}>{s} (+{SITE_DIFFICULTY_RATES[s]}%)</SelectItem>)}
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
                  }}>
                  
                                {isUploading ?
                  <div className="flex flex-col items-center gap-2">
                                        <Loader2 size={24} className="animate-spin text-blue-500" />
                                        <p className="text-gray-400 text-xs">Uploading...</p>
                                    </div> :
                  previewUrl ?
                  <img src={previewUrl} alt="preview" className="mx-auto rounded-lg object-contain max-h-[140px]" /> :
                  file && !previewUrl ?
                  <div className="flex flex-col items-center gap-2">
                                        <FileText size={24} className="text-blue-500" />
                                        <p className="text-white text-xs font-medium truncate w-full px-2">{file.name}</p>
                                    </div> :

                  <div className="flex flex-col items-center gap-2">
                                        <Upload size={24} className="text-slate-500" />
                                        <div>
                                            <p className="text-white text-sm font-medium">Upload File</p>
                                            <p className="text-slate-500 text-[10px] mt-1">Image or PDF plan</p>
                                        </div>
                                    </div>
                  }
                                <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleFileSelect} className="hidden" />
                            </div>
                            
                            <Button
                  onClick={handleAnalyze}
                  disabled={!fileUrl || isAnalyzing}
                  className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white h-11">
                  
                                {isAnalyzing ? <><Loader2 className="animate-spin mr-2" size={18} /> Analyzing...</> : <><Calculator className="mr-2" size={18} /> Generate Estimate</>}
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-2 min-w-0 overflow-hidden">
                    {result ?
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
                                <div className="flex flex-wrap gap-2 mb-4">
                                    <Button variant="outline" size="sm" onClick={() => setShowDetails(!showDetails)} className="border-slate-700 text-slate-300 hover:text-white bg-slate-800/50">
                                        {showDetails ? <><ChevronUp size={16} className="mr-1" /> Hide Details</> : <><ChevronDown size={16} className="mr-1" /> View Details</>}
                                    </Button>
                                    <SaveToProject
                                        textContent={buildEstimateText()}
                                        fileName="cost-estimate.md"
                                        assetType="document"
                                        className="border-slate-700 text-slate-300 hover:text-white bg-slate-800/50 h-8 rounded-md px-3 text-xs"
                                    />
                                    <Button variant="outline" size="sm" onClick={handleDownload} className="border-slate-700 text-slate-300 hover:text-white bg-slate-800/50">
                                        <Download size={16} className="mr-1" /> Download
                                    </Button>
                                </div>

                                <div className="overflow-x-auto rounded-xl border border-slate-800 mb-4">
                                    <Table className="min-w-[320px]">
                                        <TableHeader className="bg-slate-800/50">
                                            <TableRow className="border-slate-800">
                                                <TableHead className="text-slate-300">Category</TableHead>
                                                <TableHead className="text-slate-300 text-right">Qty</TableHead>
                                                <TableHead className="text-slate-300 text-right">Rate</TableHead>
                                                <TableHead className="text-slate-300 text-right">Total</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {result.line_items.map((item, i) =>
                      <TableRow key={i} className="border-slate-800">
                                                    <TableCell className="text-slate-400 text-sm">{item.category}</TableCell>
                                                    <TableCell className="text-right text-slate-300">{item.quantity} {item.unit}</TableCell>
                                                    <TableCell className="text-right text-slate-300">{formatCurrency(item.unit_cost)}</TableCell>
                                                    <TableCell className="text-right text-white font-medium">{formatCurrency(item.total_cost)}</TableCell>
                                                </TableRow>
                      )}
                                            <TableRow className="border-t-2 border-slate-700 bg-slate-800/20">
                                                <TableCell colSpan={3} className="text-right font-medium text-slate-300">Subtotal</TableCell>
                                                <TableCell className="text-right font-bold text-white">{formatCurrency(result.subtotal)}</TableCell>
                                            </TableRow>
                                            {result.site_difficulty_markup_cost > 0 &&
                      <TableRow className="border-slate-800 bg-amber-900/10">
                                                    <TableCell colSpan={3} className="text-right text-amber-400">
                                                        Site Difficulty Markup ({SITE_DIFFICULTY_RATES[difficulty]}%)
                                                    </TableCell>
                                                    <TableCell className="text-right text-amber-400 font-medium">
                                                        +{formatCurrency(result.site_difficulty_markup_cost)}
                                                    </TableCell>
                                                </TableRow>
                      }
                                            <TableRow className="border-t-2 border-slate-700">
                                                <TableCell colSpan={3} className="text-right font-bold text-white">Grand Total</TableCell>
                                                <TableCell className="text-right font-bold text-blue-400 text-lg">{formatCurrency(result.grand_total)}</TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </div>

                                {showDetails && (
                                    <div className="space-y-4">
                                        <div className="overflow-x-auto rounded-xl border border-slate-800">
                                            <Table className="min-w-[640px]">
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
                                                    {result.line_items.map((item, i) =>
                            <TableRow key={i} className="border-slate-800">
                                                        <TableCell className="text-slate-400 text-sm">{item.category}</TableCell>
                                                        <TableCell className="font-medium text-white">{item.item_name}</TableCell>
                                                        <TableCell className="text-right text-slate-300">{item.quantity} {item.unit}</TableCell>
                                                        <TableCell className="text-right text-slate-300">{formatCurrency(item.unit_cost)}</TableCell>
                                                        <TableCell className="text-right text-white font-medium">{formatCurrency(item.total_cost)}</TableCell>
                                                    </TableRow>
                          )}
                                                </TableBody>
                                            </Table>
                                        </div>
                                        <div>
                                            <h3 className="text-white font-medium mb-3">AI Assumptions & Notes</h3>
                                            <ul className="list-disc pl-5 space-y-1">
                                                {result.assumptions.map((a, i) =>
                            <li key={i} className="text-sm text-slate-400">{a}</li>
                            )}
                                            </ul>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card> :

            <div className="h-full border-2 border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center p-12 text-center text-slate-500 min-h-[400px]">
                            <DollarSign size={48} className="mb-4 opacity-20" />
                            <h3 className="text-lg font-medium text-slate-400 mb-2">No Estimate Generated</h3>
                            <p className="max-w-md mx-auto text-sm">Upload a floor plan or render, set your location and site details, and click Generate Estimate to see the cost breakdown here.</p>
                        </div>
            }
                </div>
            </div>
        </div>
    </div>);

}
import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Upload, Loader2, Calculator, Database, FileText, DollarSign, Download, Eye, Sparkles, Presentation } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { uploadToFirebase } from '@/lib/uploadHelper';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import SaveToProject from '@/components/SaveToProject';
import ChooseProject from '@/components/ChooseProject';

const SITE_DIFFICULTY_RATES = {
  'Level / Standard': 0,
  'Sloping / Moderate': 10,
  'Steep / Difficult': 20,
  'Extreme / Restricted Access': 30
};

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

const FINISH_MULTIPLIERS = {
  'Low': 0.85,
  'Medium': 1.0,
  'High': 1.25
};

const COUNCIL_FEE_BASE = {
  'NSW': 5500, 'VIC': 4800, 'QLD': 4200, 'WA': 4500,
  'SA': 4000, 'TAS': 3800, 'ACT': 5200, 'NT': 4600
};

const REGIONAL_FEE_MULTIPLIER = {
  'Sydney City': 1.15, 'Melbourne City': 1.1, 'Brisbane': 1.1,
  'Gold Coast': 1.05, 'Northern QLD': 0.95, 'Perth': 1.05,
  'Adelaide': 1.0, 'Hobart': 0.95, 'Canberra': 1.1, 'Darwin': 1.05,
  'Outer Suburbs': 1.0, 'Regional': 0.9
};

export default function PalladioEstimator() {
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isGeneratingPresentation, setIsGeneratingPresentation] = useState(false);
  const [presentationUrl, setPresentationUrl] = useState(null);

  const [state, setState] = useState('QLD');
  const [city, setCity] = useState('Gold Coast');
  const [storeys, setStoreys] = useState('1');
  const [difficulty, setDifficulty] = useState('Level / Standard');

  // Quantities / Areas
  const [floorArea, setFloorArea] = useState('');
  const [wetArea, setWetArea] = useState('');
  const [ceilingArea, setCeilingArea] = useState('');
  const [roofArea, setRoofArea] = useState('');
  const [externalWallArea, setExternalWallArea] = useState('');
  const [patioArea, setPatioArea] = useState('');
  const [porchArea, setPorchArea] = useState('');
  const [externalWallLength, setExternalWallLength] = useState('');
  const [internalWallLength, setInternalWallLength] = useState('');
  const [ceilingHeight, setCeilingHeight] = useState('');

  // Materials
  const [roofMaterial, setRoofMaterial] = useState('');
  const [externalWallMaterial, setExternalWallMaterial] = useState('');
  const [floorFinish, setFloorFinish] = useState('');
  const [finishLevel, setFinishLevel] = useState('Medium');

  // Garage
  const [garageArea, setGarageArea] = useState('');

  // Auto-calculated quantities
  const [slabVolume, setSlabVolume] = useState('');
  const [mainFloorCoverings, setMainFloorCoverings] = useState('');

  // Silent costs
  const [silentCosts, setSilentCosts] = useState(null);

  const [result, setResult] = useState(null);
  const [showFullEstimate, setShowFullEstimate] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const fileInputRef = useRef(null);

  const buildEstimatorDataJson = () => {
    return JSON.stringify({
      state, city, storeys, difficulty,
      floorArea, wetArea, ceilingArea, roofArea, externalWallArea, patioArea, porchArea, garageArea,
      externalWallLength, internalWallLength, ceilingHeight,
      roofMaterial, externalWallMaterial, floorFinish, finishLevel
    }, null, 2);
  };

  const handleLoadFromProject = async (project) => {
    if (!project) return;
    setIsLoadingConfig(true);
    try {
      const assets = await base44.entities.ProjectAsset.filter({ project_id: project.id, file_name: 'estimator-data.json' });
      if (assets.length > 0) {
        const asset = assets[0];
        const res = await fetch(asset.file_url);
        if (res.ok) {
          const data = await res.json();
          if (data.state) setState(data.state);
          if (data.city) setCity(data.city);
          if (data.storeys) setStoreys(data.storeys);
          if (data.difficulty) setDifficulty(data.difficulty);
          if (data.floorArea !== undefined) setFloorArea(data.floorArea);
          if (data.wetArea !== undefined) setWetArea(data.wetArea);
          if (data.ceilingArea !== undefined) setCeilingArea(data.ceilingArea);
          if (data.roofArea !== undefined) setRoofArea(data.roofArea);
          if (data.externalWallArea !== undefined) setExternalWallArea(data.externalWallArea);
          if (data.patioArea !== undefined) setPatioArea(data.patioArea);
          if (data.porchArea !== undefined) setPorchArea(data.porchArea);
          if (data.garageArea !== undefined) setGarageArea(data.garageArea);
          if (data.externalWallLength !== undefined) setExternalWallLength(data.externalWallLength);
          if (data.internalWallLength !== undefined) setInternalWallLength(data.internalWallLength);
          if (data.ceilingHeight !== undefined) setCeilingHeight(data.ceilingHeight);
          if (data.roofMaterial) setRoofMaterial(data.roofMaterial);
          if (data.externalWallMaterial) setExternalWallMaterial(data.externalWallMaterial);
          if (data.floorFinish) setFloorFinish(data.floorFinish);
          if (data.finishLevel) setFinishLevel(data.finishLevel);
          toast.success("Loaded configuration from project");
        } else {
          throw new Error("Failed to fetch asset file");
        }
      } else {
        toast.error("No saved estimator configuration found in this project");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load configuration");
    } finally {
      setIsLoadingConfig(false);
    }
  };

  useEffect(() => {
    const main = document.querySelector('main');
    if (main) main.scrollTop = 0;
  }, []);

  // Auto-calculate derived quantities
  useEffect(() => {
    const fa = parseFloat(floorArea) || 0;
    const wa = parseFloat(wetArea) || 0;
    const ga = parseFloat(garageArea) || 0;
    const ewl = parseFloat(externalWallLength) || 0;
    const ch = parseFloat(ceilingHeight) || 0;

    // Slab volume (m³) = floor area × 0.1
    setSlabVolume(fa > 0 ? (fa * 0.1).toFixed(1) : '');

    // Roof area = (floor area × 0.6) + floor area, rounded up to nearest 5m
    if (fa > 0) {
      const rawRoof = (fa * 0.6) + fa;
      setRoofArea(String(Math.ceil(rawRoof / 5) * 5));
    } else {
      setRoofArea('');
    }

    // External wall area = (external wall length × ceiling height in m) less 15% for windows/doors
    if (ewl > 0 && ch > 0) {
      const gross = ewl * (ch / 1000);
      setExternalWallArea((gross * 0.85).toFixed(1));
    } else {
      setExternalWallArea('');
    }

    // Main floor coverings = floor area - wet areas - garage area
    if (fa > 0) {
      const coverings = fa - wa - ga;
      setMainFloorCoverings(coverings > 0 ? coverings.toFixed(1) : '');
    } else {
      setMainFloorCoverings('');
    }
  }, [floorArea, wetArea, garageArea, externalWallLength, ceilingHeight]);

  const handleAutoExtract = async () => {
    if (!fileUrl) return;
    setIsExtracting(true);
    try {
      const tokenRes = await base44.functions.invoke('consumeToken', {});
      if (tokenRes.data?.error) {
        toast.error("You don't have enough AI tokens. Please upgrade your plan.");
        setIsExtracting(false);
        return;
      }

      const prompt = `Analyze this dimensioned floor plan. Extract the following architectural quantities. Return ONLY a JSON object with these exact keys (use numbers only, no units, or 0 if cannot be determined). If a dimension is missing, try to estimate it based on standard proportions, but prioritize written dimensions:
      - floorArea (m2)
      - wetArea (m2)
      - ceilingArea (m2)
      - patioArea (m2)
      - porchArea (m2)
      - garageArea (m2)
      - externalWallLength (m)
      - internalWallLength (m)
      - ceilingHeight (mm)`;

      const responseSchema = {
        type: "object",
        properties: {
          floorArea: { type: "number" },
          wetArea: { type: "number" },
          ceilingArea: { type: "number" },
          patioArea: { type: "number" },
          porchArea: { type: "number" },
          garageArea: { type: "number" },
          externalWallLength: { type: "number" },
          internalWallLength: { type: "number" },
          ceilingHeight: { type: "number" }
        }
      };

      const jsonPrompt = prompt + `\n\nCRITICAL: Return ONLY valid JSON matching this schema: ${JSON.stringify(responseSchema)}`;
      const resData = await base44.functions.invoke('superagentInvoke', {
        input: jsonPrompt,
        fileUrls: [fileUrl]
      });
      if (resData.data?.error) {
        throw new Error(resData.data.error);
      }
      const rawContent = resData.data?.output || "";
      const res = extractJson(rawContent);

      if (res) {
        if (res.floorArea) setFloorArea(String(res.floorArea));
        if (res.wetArea) setWetArea(String(res.wetArea));
        if (res.ceilingArea) setCeilingArea(String(res.ceilingArea));
        if (res.patioArea) setPatioArea(String(res.patioArea));
        if (res.porchArea) setPorchArea(String(res.porchArea));
        if (res.garageArea) setGarageArea(String(res.garageArea));
        if (res.externalWallLength) setExternalWallLength(String(res.externalWallLength));
        if (res.internalWallLength) setInternalWallLength(String(res.internalWallLength));
        if (res.ceilingHeight) setCeilingHeight(String(res.ceilingHeight));
        toast.success("Quantities auto-extracted from plan!");
      } else {
        toast.error("Quantities could not be determined. Check the file or try again.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to extract quantities: " + (err.message || 'Error'));
    } finally {
      setIsExtracting(false);
    }
  };

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
      const res = await uploadToFirebase(selectedFile);
      const url = res?.file_url;
      if (!url) throw new Error('Upload failed');
      setFileUrl(url);
    } catch (err) {
      toast.error('Failed to upload file. ' + (err.message || ''));
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
- Finish Level: ${finishLevel} (Apply a ×${FINISH_MULTIPLIERS[finishLevel]} multiplier to all finish/material line items)

User-Provided Quantities (use these where provided, override AI estimates):
- Floor Area: ${floorArea || 'not provided'} m²
- Wet Area: ${wetArea || 'not provided'} m²
- Garage Area: ${garageArea || 'not provided'} m²
- Ceiling Area: ${ceilingArea || 'not provided'} m²
- Roof Area: ${roofArea || 'not provided'} m²
- External Wall Area: ${externalWallArea || 'not provided'} m²
- Patio Area: ${patioArea || 'not provided'} m²
- Porch Area: ${porchArea || 'not provided'} m²
- External Wall Length: ${externalWallLength || 'not provided'} m
- Internal Wall Length: ${internalWallLength || 'not provided'} m
- Ceiling Height: ${ceilingHeight || 'not provided'} mm
- Slab Volume (auto-calc): ${slabVolume || 'not provided'} m³
- Main Floor Coverings (auto-calc): ${mainFloorCoverings || 'not provided'} m²

Selected Materials:
- Roof: ${roofMaterial || 'not specified'}
- External Walls: ${externalWallMaterial || 'not specified'}
- Floor Finish: ${floorFinish || 'not specified'}

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

      const jsonPrompt = prompt + `\n\nCRITICAL: Return ONLY valid JSON matching this schema: ${JSON.stringify(responseSchema)}`;
      const resData = await base44.functions.invoke('superagentInvoke', {
        input: jsonPrompt,
        fileUrls: [fileUrl]
      });
      if (resData.data?.error) {
        throw new Error(resData.data.error);
      }
      const rawContent = resData.data?.output || "";
      const res = extractJson(rawContent) || { line_items: [], subtotal: 0, scaffolding_included: false, site_difficulty_markup_cost: 0, grand_total: 0, assumptions: [] };

      setResult(res);

      // Calculate silent costs (gutter/fascia, design, engineering, council, scaffolding)
      const subtotal = res.subtotal || 0;
      const regionalMult = REGIONAL_FEE_MULTIPLIER[city] || 1.0;
      const councilBase = COUNCIL_FEE_BASE[state] || 4500;
      const wallLen = parseFloat(externalWallLength) || (Math.sqrt(parseFloat(floorArea) || 0) * 4);
      const gutterLength = wallLen * 1.3;
      const gutterCost = gutterLength * 45;
      const designFees = subtotal * 0.015 * regionalMult;
      const engineeringFees = subtotal * 0.02 * regionalMult;
      const councilFees = councilBase * regionalMult;
      const needsScaffolding = parseInt(storeys) >= 2;
      const scaffoldingCost = needsScaffolding ? subtotal * 0.02 : 0;
      setSilentCosts({
        gutterLength,
        gutter: gutterCost,
        design: designFees,
        engineering: engineeringFees,
        council: councilFees,
        scaffolding: scaffoldingCost,
        total: gutterCost + designFees + engineeringFees + councilFees + scaffoldingCost
      });

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
    if (silentCosts) {
      text += `\n## Additional Costs (Auto-Calculated)\n\n`;
      text += `- Gutter & Fascia (${silentCosts.gutterLength.toFixed(1)} m): ${formatCurrency(silentCosts.gutter)}\n`;
      text += `- Design & Drafting Fees (1.5%): ${formatCurrency(silentCosts.design)}\n`;
      text += `- Engineering Fees (2%): ${formatCurrency(silentCosts.engineering)}\n`;
      text += `- Approval Fees (${state}): ${formatCurrency(silentCosts.council)}\n`;
      if (silentCosts.scaffolding > 0) text += `- Scaffolding (2+ storeys): ${formatCurrency(silentCosts.scaffolding)}\n`;
      text += `\n**Additional Costs Total:** ${formatCurrency(silentCosts.total)}\n`;
      text += `**Revised Grand Total:** ${formatCurrency(result.grand_total + silentCosts.total)}\n`;
    }
    return text;
  };

  const handleGeneratePresentation = async () => {
    if (!result) return;
    setIsGeneratingPresentation(true);
    try {
      const res = await base44.functions.invoke('generatePresentation', {
        presentation_data: {
          ...result,
          grand_total: result.grand_total + (silentCosts ? silentCosts.total : 0),
          location_profile: `${city}, ${state}`,
          total_floor_area_sqm: `${floorArea || 0} sqm`,
          level_of_finish: finishLevel
        }
      });
      
      if (res.data?.url) {
        toast.success("Your presentation is ready!", {
          duration: 5000,
          position: "top-center",
          style: { background: '#10b981', color: 'white', border: 'none', fontWeight: 'bold', fontSize: '1.1rem' }
        });
        setPresentationUrl(res.data.url);
      } else {
        throw new Error(res.data?.error || "Unknown error");
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate presentation');
    } finally {
      setIsGeneratingPresentation(false);
    }
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
    <div className="min-h-screen bg-[#0f1117] text-white p-4 sm:p-6 pb-8">
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
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-end">
                <ChooseProject onSelect={handleLoadFromProject} className="border-slate-700 text-slate-300 hover:text-white bg-slate-800/50 h-9 px-3 text-xs">
                    {isLoadingConfig ? <Loader2 size={16} className="animate-spin mr-1" /> : "Load Config"}
                </ChooseProject>
                <SaveToProject textContent={buildEstimatorDataJson()} fileName="estimator-data.json" assetType="document" className="border-slate-700 text-slate-300 hover:text-white bg-slate-800/50 h-9 px-3 text-xs">
                    Save Config
                </SaveToProject>
                <Link to={createPageUrl('CostDatabase')}>
                    <Button variant="outline" className="border-slate-700 text-slate-300 hover:text-white bg-slate-800/50 h-9 px-3 text-xs">
                        <Database className="w-4 h-4 mr-1" />
                        Cost DB
                    </Button>
                </Link>
            </div>
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

                    <Card className="bg-slate-900 border-slate-800 overflow-hidden">
                        <CardHeader>
                            <CardTitle className="text-white text-lg">Upload Plan / Render</CardTitle>
                        </CardHeader>
                        <CardContent className="overflow-hidden">
                            <div
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-xl p-4 sm:p-6 text-center cursor-pointer transition-all flex flex-col justify-center items-center min-h-[160px] overflow-hidden w-full min-w-0 max-w-full"
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
                  <div className="flex flex-col items-center gap-2 w-full px-2">
                                        <FileText size={24} className="text-blue-500 shrink-0" />
                                        <p className="text-white text-xs font-medium break-all whitespace-normal text-center max-w-full">{file.name}</p>
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
                            
                            {fileUrl && (
                                <Button
                                  onClick={handleAutoExtract}
                                  disabled={isExtracting || isAnalyzing}
                                  variant="secondary"
                                  className="w-full mt-4 mb-2 border border-slate-700 text-cyan-400 hover:text-cyan-300 hover:bg-slate-800 bg-slate-800/50 h-11">
                                  {isExtracting ? <><Loader2 className="animate-spin mr-2" size={18} /> Extracting Quantities...</> : <><Sparkles className="mr-2" size={18} /> Auto-Extract Quantities</>}
                                </Button>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-900 border-slate-800">
                        <CardHeader>
                            <CardTitle className="text-white text-lg">Quantities/Areas (mm/m)</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Areas</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-slate-400 mb-1 block">Floor (m²)</label>
                                        <Input type="number" value={floorArea} onChange={(e) => setFloorArea(e.target.value)} placeholder="0" className="bg-slate-800 border-slate-700 text-white h-10" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400 mb-1 block">Wet (m²)</label>
                                        <Input type="number" value={wetArea} onChange={(e) => setWetArea(e.target.value)} placeholder="0" className="bg-slate-800 border-slate-700 text-white h-10" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400 mb-1 block">Ceiling (m²)</label>
                                        <Input type="number" value={ceilingArea} onChange={(e) => setCeilingArea(e.target.value)} placeholder="0" className="bg-slate-800 border-slate-700 text-white h-10" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400 mb-1 block">Roof (m²)</label>
                                        <Input type="number" value={roofArea} onChange={(e) => setRoofArea(e.target.value)} placeholder="0" className="bg-slate-800 border-slate-700 text-white h-10" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400 mb-1 block">External Wall Area (m²)</label>
                                        <Input type="number" value={externalWallArea} onChange={(e) => setExternalWallArea(e.target.value)} placeholder="0" className="bg-slate-800 border-slate-700 text-white h-10" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400 mb-1 block">Patio (m²)</label>
                                        <Input type="number" value={patioArea} onChange={(e) => setPatioArea(e.target.value)} placeholder="0" className="bg-slate-800 border-slate-700 text-white h-10" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-xs text-slate-400 mb-1 block">Porch (m²)</label>
                                        <Input type="number" value={porchArea} onChange={(e) => setPorchArea(e.target.value)} placeholder="0" className="bg-slate-800 border-slate-700 text-white h-10" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-xs text-slate-400 mb-1 block">Garage (m²)</label>
                                        <Input type="number" value={garageArea} onChange={(e) => setGarageArea(e.target.value)} placeholder="0" className="bg-slate-800 border-slate-700 text-white h-10" />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Lengths</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-slate-400 mb-1 block">External Wall Length (m)</label>
                                        <Input type="number" value={externalWallLength} onChange={(e) => setExternalWallLength(e.target.value)} placeholder="0" className="bg-slate-800 border-slate-700 text-white h-10" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400 mb-1 block">Internal Wall Length (m)</label>
                                        <Input type="number" value={internalWallLength} onChange={(e) => setInternalWallLength(e.target.value)} placeholder="0" className="bg-slate-800 border-slate-700 text-white h-10" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-xs text-slate-400 mb-1 block">Ceiling Height (mm)</label>
                                        <Input type="number" value={ceilingHeight} onChange={(e) => setCeilingHeight(e.target.value)} placeholder="0" className="bg-slate-800 border-slate-700 text-white h-10" />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-2">Auto-Calculated</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-slate-400 mb-1 block">Slab Volume (m³) <span className="text-cyan-500/70">auto</span></label>
                                        <Input type="text" value={slabVolume} readOnly placeholder="—" className="bg-slate-800/50 border-slate-700/50 text-slate-300 h-10" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400 mb-1 block">Main Floor Coverings (m²) <span className="text-cyan-500/70">auto</span></label>
                                        <Input type="text" value={mainFloorCoverings} readOnly placeholder="—" className="bg-slate-800/50 border-slate-700/50 text-slate-300 h-10" />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-900 border-slate-800">
                        <CardHeader>
                            <CardTitle className="text-white text-lg">(Materials)</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="text-xs text-slate-400 mb-1 block">Roof</label>
                                <Select value={roofMaterial} onValueChange={setRoofMaterial}>
                                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-10"><SelectValue placeholder="Select roof material" /></SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                                        {['Colorbond Steel', 'Concrete Tile', 'Terracotta Tile', 'Slate', 'Metal Deck', 'Flat Membrane'].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 mb-1 block">External Walls</label>
                                <Select value={externalWallMaterial} onValueChange={setExternalWallMaterial}>
                                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-10"><SelectValue placeholder="Select wall material" /></SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                                        {['Brick Veneer', 'Double Brick', 'Weatherboard', 'Hebel (AAC)', 'Rendered Foam', 'Concrete Block', 'Cladding'].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 mb-1 block">Floor Finish</label>
                                <Select value={floorFinish} onValueChange={setFloorFinish}>
                                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-10"><SelectValue placeholder="Select floor finish" /></SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                                        {['Tiles', 'Timber', 'Carpet', 'Polished Concrete', 'Hybrid Vinyl', 'Stone', 'Laminate'].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 mb-1 block">Finish Level</label>
                                <Select value={finishLevel} onValueChange={setFinishLevel}>
                                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-10"><SelectValue /></SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                                        {['Low', 'Medium', 'High'].map((f) => <SelectItem key={f} value={f}>{f} (×{FINISH_MULTIPLIERS[f]})</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    <Button
                      onClick={handleAnalyze}
                      disabled={!fileUrl || isAnalyzing || isExtracting}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white h-14 text-lg font-semibold shadow-lg shadow-blue-900/20">
                      {isAnalyzing ? <><Loader2 className="animate-spin mr-2" size={24} /> Analyzing Project...</> : <><Calculator className="mr-2" size={24} /> Generate Estimate</>}
                    </Button>
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
                                    <Button variant="outline" size="sm" onClick={() => setShowFullEstimate(true)} className="border-slate-700 text-slate-300 hover:text-white bg-slate-800/50">
                                        <Eye size={16} className="mr-1" /> View Full Estimate
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
                                    <Button 
                                      variant="secondary" 
                                      size="sm" 
                                      onClick={handleGeneratePresentation} 
                                      disabled={isGeneratingPresentation}
                                      className="border-blue-700/50 text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 bg-blue-900/20">
                                        {isGeneratingPresentation ? <><Loader2 size={16} className="mr-1 animate-spin" /> Generating...</> : <><Presentation size={16} className="mr-1" /> Presentation Slide</>}
                                    </Button>
                                    {presentationUrl && (
                                        <>
                                            <a href={presentationUrl} target="_blank" rel="noreferrer">
                                                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)] border-2 border-emerald-400">
                                                    <Download size={18} className="mr-2" /> View & Download Presentation
                                                </Button>
                                            </a>
                                            <SaveToProject
                                                fileUrl={presentationUrl}
                                                fileName="presentation-slides.pdf"
                                                assetType="document"
                                                className="border-slate-700 text-slate-300 hover:text-white bg-slate-800/50 h-10 rounded-md px-4 text-sm"
                                            />
                                        </>
                                    )}
                                </div>

                                <div className="rounded-xl border border-slate-800 mb-4">
                                    <Table>
                                        <TableHeader className="bg-slate-800/50">
                                            <TableRow className="border-slate-800">
                                                <TableHead className="text-slate-300">Category</TableHead>
                                                <TableHead className="text-slate-300 text-right">Qty</TableHead>
                                                <TableHead className="text-slate-300 text-right">Total</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {result.line_items.map((item, i) =>
                      <TableRow key={i} className="border-slate-800">
                                                    <TableCell className="text-slate-400 text-sm">{item.category}</TableCell>
                                                    <TableCell className="text-right text-slate-300">{item.quantity} {item.unit}</TableCell>
                                                    <TableCell className="text-right text-white font-medium">{formatCurrency(item.total_cost)}</TableCell>
                                                </TableRow>
                      )}
                                            <TableRow className="border-t-2 border-slate-700 bg-slate-800/20">
                                                <TableCell colSpan={2} className="text-right font-medium text-slate-300">Subtotal</TableCell>
                                                <TableCell className="text-right font-bold text-white">{formatCurrency(result.subtotal)}</TableCell>
                                            </TableRow>
                                            {result.site_difficulty_markup_cost > 0 &&
                      <TableRow className="border-slate-800 bg-amber-900/10">
                                                    <TableCell colSpan={2} className="text-right text-amber-400">
                                                        Site Difficulty Markup ({SITE_DIFFICULTY_RATES[difficulty]}%)
                                                    </TableCell>
                                                    <TableCell className="text-right text-amber-400 font-medium">
                                                        +{formatCurrency(result.site_difficulty_markup_cost)}
                                                    </TableCell>
                                                </TableRow>
                      }
                                            <TableRow className="border-t-2 border-slate-700">
                                                <TableCell colSpan={2} className="text-right font-bold text-white">Grand Total</TableCell>
                                                <TableCell className="text-right font-bold text-blue-400 text-lg">{formatCurrency(result.grand_total)}</TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </div>

                                {silentCosts && (
                                    <div className="rounded-xl border border-slate-800 mb-4 bg-slate-800/20">
                                        <div className="px-4 py-3 border-b border-slate-800">
                                            <p className="text-sm font-semibold text-cyan-400">Additional Costs (Auto-Calculated)</p>
                                            <p className="text-xs text-slate-500">Regional multiplier ×{REGIONAL_FEE_MULTIPLIER[city] || 1.0} · Finish: {finishLevel} (×{FINISH_MULTIPLIERS[finishLevel]})</p>
                                        </div>
                                        <div className="divide-y divide-slate-800">
                                            <div className="flex justify-between items-center px-4 py-2.5">
                                                <div>
                                                    <span className="text-sm text-slate-300">Gutter & Fascia</span>
                                                    <span className="text-xs text-slate-500 block">{silentCosts.gutterLength.toFixed(1)} m @ $45/m</span>
                                                </div>
                                                <span className="text-sm text-white font-medium">{formatCurrency(silentCosts.gutter)}</span>
                                            </div>
                                            <div className="flex justify-between items-center px-4 py-2.5">
                                                <span className="text-sm text-slate-300">Design & Drafting Fees (1.5%)</span>
                                                <span className="text-sm text-white font-medium">{formatCurrency(silentCosts.design)}</span>
                                            </div>
                                            <div className="flex justify-between items-center px-4 py-2.5">
                                                <span className="text-sm text-slate-300">Engineering Fees (2%)</span>
                                                <span className="text-sm text-white font-medium">{formatCurrency(silentCosts.engineering)}</span>
                                            </div>
                                            <div className="flex justify-between items-center px-4 py-2.5">
                                                <span className="text-sm text-slate-300">Approval Fees ({state})</span>
                                                <span className="text-sm text-white font-medium">{formatCurrency(silentCosts.council)}</span>
                                            </div>
                                            {silentCosts.scaffolding > 0 && (
                                                <div className="flex justify-between items-center px-4 py-2.5">
                                                    <span className="text-sm text-slate-300">Scaffolding (2+ storeys)</span>
                                                    <span className="text-sm text-white font-medium">{formatCurrency(silentCosts.scaffolding)}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between items-center px-4 py-3 bg-slate-800/30">
                                                <span className="text-sm font-semibold text-slate-200">Additional Costs Total</span>
                                                <span className="text-sm font-bold text-cyan-400">{formatCurrency(silentCosts.total)}</span>
                                            </div>
                                            <div className="flex justify-between items-center px-4 py-3 border-t-2 border-slate-700">
                                                <span className="text-base font-bold text-white">Revised Grand Total</span>
                                                <span className="text-base font-bold text-blue-400">{formatCurrency(result.grand_total + silentCosts.total)}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <Dialog open={showFullEstimate} onOpenChange={setShowFullEstimate}>
                                    <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-3xl max-h-[85vh] overflow-y-auto">
                                        <DialogHeader>
                                            <DialogTitle className="text-white text-xl">Full Estimate</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                                                <span className="text-slate-400 text-sm">Grand Total</span>
                                                <span className="text-2xl font-bold text-blue-400">{formatCurrency(result.grand_total)}</span>
                                            </div>
                                            <div className="overflow-x-auto rounded-xl border border-slate-800">
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
                                                        {result.line_items.map((item, i) =>
                            <TableRow key={i} className="border-slate-800">
                                                            <TableCell className="text-slate-400 text-sm">{item.category}</TableCell>
                                                            <TableCell className="font-medium text-white">{item.item_name}</TableCell>
                                                            <TableCell className="text-right text-slate-300">{item.quantity} {item.unit}</TableCell>
                                                            <TableCell className="text-right text-slate-300">{formatCurrency(item.unit_cost)}</TableCell>
                                                            <TableCell className="text-right text-white font-medium">{formatCurrency(item.total_cost)}</TableCell>
                                                        </TableRow>
                          )}
                                                        <TableRow className="border-t-2 border-slate-700 bg-slate-800/20">
                                                            <TableCell colSpan={4} className="text-right font-medium text-slate-300">Subtotal</TableCell>
                                                            <TableCell className="text-right font-bold text-white">{formatCurrency(result.subtotal)}</TableCell>
                                                        </TableRow>
                                                        {result.site_difficulty_markup_cost > 0 &&
                            <TableRow className="border-slate-800 bg-amber-900/10">
                                                                <TableCell colSpan={4} className="text-right text-amber-400">
                                                                    Site Difficulty Markup ({SITE_DIFFICULTY_RATES[difficulty]}%)
                                                                </TableCell>
                                                                <TableCell className="text-right text-amber-400 font-medium">
                                                                    +{formatCurrency(result.site_difficulty_markup_cost)}
                                                                </TableCell>
                                                            </TableRow>
                          }
                                                        <TableRow className="border-t-2 border-slate-700">
                                                            <TableCell colSpan={4} className="text-right font-bold text-white">Grand Total</TableCell>
                                                            <TableCell className="text-right font-bold text-blue-400 text-lg">{formatCurrency(result.grand_total)}</TableCell>
                                                        </TableRow>
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
                                    </DialogContent>
                                </Dialog>
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
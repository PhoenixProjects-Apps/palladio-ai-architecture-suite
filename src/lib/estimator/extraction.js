// Dimension-harvesting helpers for the Palladio Estimator.
// The AI only harvests raw dimensions from the plan, split into
// new / existing_retained / demolished buckets; every derived figure
// (roof surface area, slab volume, wall area, GST, margin) stays in the
// deterministic helpers in calculateEstimate.js.

export const BUCKETED_FIELDS = [
  'floorArea', 'groundFloorArea', 'upperFloorArea', 'wetArea', 'ceilingArea',
  'roofFootprintArea', 'externalWallLength', 'internalWallLength', 'externalWallArea',
  'slabArea', 'garageArea', 'patioArea', 'porchArea'
];

export const SCALAR_FIELDS = ['roofPitchDegrees', 'roofAreaOverride', 'ceilingHeight', 'slabVolume'];

export const EXTRACTION_FIELD_KEYS = [...BUCKETED_FIELDS, ...SCALAR_FIELDS];

// Untouched defaults the user has not typed over — a confident extraction may replace these.
export const PRISTINE_DEFAULTS = { roofPitchDegrees: '22.5' };

const AREA_FIELDS = new Set([
  'floorArea', 'groundFloorArea', 'upperFloorArea', 'wetArea', 'ceilingArea',
  'roofFootprintArea', 'externalWallArea', 'slabArea', 'garageArea', 'patioArea', 'porchArea'
]);

// Area-type fields whose demolished bucket adds to the Demolition & Spoil Removal quantity.
export const DEMOLITION_AREA_FIELDS = [
  'floorArea', 'wetArea', 'ceilingArea', 'externalWallArea', 'garageArea', 'patioArea', 'porchArea'
];

export const FIELD_LABELS = {
  floorArea: 'Floor',
  groundFloorArea: 'Ground Floor',
  upperFloorArea: 'Upper Floor',
  wetArea: 'Wet Area',
  ceilingArea: 'Ceiling',
  roofFootprintArea: 'Roof Footprint',
  externalWallLength: 'External Wall Length',
  internalWallLength: 'Internal Wall Length',
  externalWallArea: 'External Wall Area',
  slabArea: 'Slab',
  slabVolume: 'Slab Volume',
  garageArea: 'Garage',
  patioArea: 'Patio',
  porchArea: 'Porch',
  roofPitchDegrees: 'Roof Pitch',
  roofAreaOverride: 'Roof Area Override',
  ceilingHeight: 'Ceiling Height'
};

export function extractJson(text) {
  if (!text) return null;
  // Structured LLM responses (response_json_schema) already arrive as objects.
  if (typeof text === 'object') return text;
  let s = String(text).trim().replace(/```json/gi, '').replace(/```/g, '').trim();
  try { return JSON.parse(s); } catch (_) {}
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    try { return JSON.parse(s.slice(start, end + 1)); } catch (_) {}
  }
  return null;
}

export function buildExtractionPrompt() {
  return `You are extracting explicit construction quantity inputs from architectural drawings for a deterministic estimating engine.

PROJECT SCOPE RULES - EXISTING vs NEW:
- Read the plan's line styles and annotations to classify every element:
  * Dashed or hatched lines, or annotations "EXISTING", "EXIST.", "RETAIN", "TO REMAIN" = existing structure that stays untouched (existing_retained).
  * Annotations "DEMO", "DEMOLISH", "REMOVE", or dashed lines with cross marks = existing work to be removed (demolished).
  * Solid lines, or annotations "NEW", "PROPOSED" = new work (value).
- For every bucketed field return three quantities:
  * "value": NEW work only - the quantity that will actually be constructed and paid for.
  * "existing_retained": existing structure that stays untouched.
  * "demolished": existing work to be removed.
- The roofFootprintArea "value" must ONLY include NEW roof: the new extension roof plus any re-roofed or replaced portion. NEVER include the retained existing roof in "value" - put the retained existing roof in "existing_retained".
- If you cannot confidently tell whether an element is existing or new, count it in "value" (new) and set "ambiguous": true with a short "note" explaining the uncertainty. Never guess a split you cannot see.
- For a New Build plan, "existing_retained" and "demolished" must be 0.

QUANTITY RULES:
1. Extract only values that are explicitly stated, dimensioned, scheduled, or directly calculable from clearly dimensioned plan geometry.
2. Do not guess, infer from typical building ratios, or invent missing values.
3. If a value is not shown or cannot be confidently determined, return 0.
4. For every extracted field, include confidence and source notes.
5. If a value is calculated from visible dimensions, say so in the source note.
6. Never derive roof area from total floor area. Roof quantity must come from roof footprint/roof plan dimensions, stated roof area, or manual user input.
7. Prefer explicit drawing schedules and area tables over visual approximation.
8. Use square metres for areas, lineal metres for lengths, cubic metres for volumes, and millimetres for ceiling height.

Allowed confidence values:
high = explicitly stated or scheduled
medium = directly calculated from visible dimensions
low = visible but uncertain / requires manual check
none = not shown, value must be 0

Return this JSON shape exactly:
{
  "fields": {
    "floorArea": { "value": 0, "existing_retained": 0, "demolished": 0, "ambiguous": false, "note": "", "unit": "m²", "confidence": "none", "source": "Not shown" },
    "groundFloorArea": { ... same shape ... },
    "upperFloorArea": { ... same shape ... },
    "wetArea": { ... same shape ... },
    "ceilingArea": { ... same shape ... },
    "roofFootprintArea": { ... same shape (value = NEW roof footprint only) ... },
    "externalWallLength": { ... same shape ... },
    "internalWallLength": { ... same shape ... },
    "externalWallArea": { ... same shape ... },
    "slabArea": { ... same shape ... },
    "garageArea": { ... same shape ... },
    "patioArea": { ... same shape ... },
    "porchArea": { ... same shape ... },
    "roofPitchDegrees": { "value": 0, "unit": "degrees", "confidence": "none", "source": "Not shown" },
    "roofAreaOverride": { "value": 0, "unit": "m²", "confidence": "none", "source": "Not shown" },
    "ceilingHeight": { "value": 0, "unit": "mm", "confidence": "none", "source": "Not shown" },
    "slabVolume": { "value": 0, "unit": "m³", "confidence": "none", "source": "Not shown" }
  },
  "warnings": [
    "List missing or low-confidence values that need manual review"
  ]
}`;
}

export function buildExtractionResponseSchema() {
  const bucketed = {
    type: 'object',
    properties: {
      value: { type: 'number' },
      existing_retained: { type: 'number' },
      demolished: { type: 'number' },
      ambiguous: { type: 'boolean' },
      note: { type: 'string' },
      unit: { type: 'string' },
      confidence: { type: 'string', enum: ['high', 'medium', 'low', 'none'] },
      source: { type: 'string' }
    },
    required: ['value', 'existing_retained', 'demolished', 'ambiguous', 'unit', 'confidence', 'source']
  };
  const scalar = {
    type: 'object',
    properties: {
      value: { type: 'number' },
      unit: { type: 'string' },
      confidence: { type: 'string', enum: ['high', 'medium', 'low', 'none'] },
      source: { type: 'string' }
    },
    required: ['value', 'unit', 'confidence', 'source']
  };
  const fieldSchema = (key) => (BUCKETED_FIELDS.includes(key) ? bucketed : scalar);
  return {
    type: 'object',
    properties: {
      fields: {
        type: 'object',
        properties: Object.fromEntries(EXTRACTION_FIELD_KEYS.map((key) => [key, fieldSchema(key)]))
      },
      warnings: { type: 'array', items: { type: 'string' } }
    },
    required: ['fields', 'warnings']
  };
}

// ---- response normalisation -------------------------------------------------

function coerceNumber(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'string') {
    let s = v.replace(/\s/g, '');
    if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, '');
    else s = s.replace(/,/g, '.');
    s = s.replace(/[^0-9.\-]/g, '');
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

const compact = (s) => String(s).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

// Extra accepted spellings per field (compacted, lowercase).
const FIELD_NAME_VARIANTS = {
  roofFootprintArea: [compact('roofFootprint'), compact('roofArea'), compact('newRoofArea'), compact('newRoofFootprintArea')],
  roofPitchDegrees: [compact('roofPitch'), compact('pitch')],
  ceilingHeight: [compact('ceilingHeightMm'), compact('wallHeight')],
  floorArea: [compact('totalFloorArea')]
};

function bucketNameVariants(key) {
  return {
    new: [compact(`${key}_new`), compact(`new_${key}`)],
    existing: [compact(`${key}_existing`), compact(`${key}_existing_retained`), compact(`${key}_retained`), compact(`existing_${key}`)],
    demolished: [compact(`${key}_demolished`), compact(`${key}_demo`), compact(`demolished_${key}`)]
  };
}

function containerIndex(container) {
  const idx = {};
  Object.entries(container || {}).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    const c = compact(k);
    if (!(c in idx)) idx[c] = v;
  });
  return idx;
}

// Unit sanity: models sometimes report heights in metres or lengths/areas in mm.
function saneValue(key, v) {
  if (!Number.isFinite(v) || v <= 0) return 0;
  if (key === 'ceilingHeight') return v < 20 ? Math.round(v * 1000) : v;
  if (key === 'externalWallLength' || key === 'internalWallLength') return v > 1000 ? v / 1000 : v;
  if (AREA_FIELDS.has(key) && v > 100000) return v / 1000000; // mm² given
  return v;
}

function resolveField(containers, key) {
  const withBuckets = BUCKETED_FIELDS.includes(key);
  const nameVariants = [compact(key), ...(FIELD_NAME_VARIANTS[key] || [])];

  for (const container of containers) {
    const idx = containerIndex(container);
    const hit = nameVariants.map((n) => idx[n]).find((v) => v !== undefined);
    if (hit === undefined) continue;

    const obj = hit && typeof hit === 'object' && !Array.isArray(hit) ? hit : null;
    const isFlat = !obj;
    const variants = bucketNameVariants(key);
    const pick = (names) => {
      for (const n of names) {
        const v = idx[n];
        if (v !== undefined) return v;
      }
      return undefined;
    };

    const rawValue = obj
      ? (obj.value !== undefined ? obj.value : obj.new)
      : (isFlat ? hit : pick(variants.new));

    const entry = {
      value: saneValue(key, coerceNumber(rawValue)),
      confidence: (obj && typeof obj.confidence === 'string' && obj.confidence) || (rawValue !== undefined && coerceNumber(rawValue) > 0 ? 'low' : 'none'),
      source: (obj && typeof obj.source === 'string' && obj.source) || (isFlat && coerceNumber(hit) > 0 ? 'Flat extraction value' : 'Not shown'),
      unit: (obj && typeof obj.unit === 'string' && obj.unit) || ''
    };

    if (withBuckets) {
      const rawExisting = obj
        ? (obj.existing_retained !== undefined ? obj.existing_retained : (obj.existing !== undefined ? obj.existing : obj.retained))
        : pick(variants.existing);
      const rawDemolished = obj
        ? (obj.demolished !== undefined ? obj.demolished : obj.demo)
        : pick(variants.demolished);
      entry.existingRetained = saneValue(key, coerceNumber(rawExisting));
      entry.demolished = saneValue(key, coerceNumber(rawDemolished));
      entry.ambiguous = Boolean(obj ? (obj.ambiguous === true || /ambiguous|unclear|cannot confirm/i.test(obj.note || '')) : false);
      entry.note = (obj && typeof obj.note === 'string' && obj.note) || '';
    }
    return entry;
  }
  return null;
}

/**
 * Normalises a raw extraction response into { fields, warnings }.
 * Tolerates camelCase/snake_case key mismatches, flat vs nested layouts,
 * string values, and mm/m unit mix-ups.
 */
export function normaliseExtractionResponse(res) {
  const warnings = Array.isArray(res?.warnings) ? res.warnings.filter((w) => typeof w === 'string') : [];
  const containers = [res?.fields, res?.quantities, res?.data, res].filter(Boolean);
  const fields = {};
  for (const key of EXTRACTION_FIELD_KEYS) {
    const entry = resolveField(containers, key);
    if (entry) fields[key] = entry;
  }
  return { fields, warnings };
}

/** Effective value fed into the estimate: new work only (all buckets only for New Build). */
export function computeAppliedQuantity(entry, projectType) {
  if (!entry) return 0;
  const value = entry.value || 0;
  if (projectType === 'New Build') return value + (entry.existingRetained || 0) + (entry.demolished || 0);
  return value;
}

/** Total demolished area (m²) that feeds the Demolition & Spoil Removal line item. */
export function sumDemolitionArea(fields) {
  const total = DEMOLITION_AREA_FIELDS.reduce((sum, key) => sum + (fields?.[key]?.demolished || 0), 0);
  return Math.round(total * 10) / 10;
}

/**
 * A harvested value is applied when it is positive, confident enough, and the
 * current field is empty / at its pristine default, or an earlier extraction
 * already populated it (re-run overwrite). User-entered values are preserved.
 */
export function shouldApplyExtractedValue(currentValue, extractedValue, meta, { allowOverwrite = false } = {}) {
  const extracted = Number.parseFloat(extractedValue);
  if (!Number.isFinite(extracted)) return false;
  if (extracted <= 0) return false;
  if (meta?.confidence === 'none') return false;
  const current = Number.parseFloat(currentValue);
  const occupied = Number.isFinite(current) && current > 0;
  if (occupied && !allowOverwrite) return false;
  return true;
}
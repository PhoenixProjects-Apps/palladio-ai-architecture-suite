export function calculateRoofSurfaceArea({ roofFootprintArea, roofPitchDegrees, roofComplexity, roofWastePercent, roofAreaOverride }) {
  if (roofAreaOverride) return parseFloat(roofAreaOverride) || 0;
  
  const footprint = parseFloat(roofFootprintArea) || 0;
  if (!footprint) return 0;
  const pitch = parseFloat(roofPitchDegrees) || 22.5;
  const pitchRadians = pitch * (Math.PI / 180);
  
  let surfaceArea = footprint / Math.cos(pitchRadians);
  
  let waste = 0;
  if (roofWastePercent) {
    waste = parseFloat(roofWastePercent) / 100;
  } else {
    if (roofComplexity === 'Simple gable roof') waste = 0.05;
    else if (roofComplexity === 'Standard hip roof') waste = 0.08;
    else if (roofComplexity === 'Complex multi-hip/valley') waste = 0.12;
    else if (roofComplexity === 'Flat/skillion roof') waste = 0.02;
  }
  
  return parseFloat((surfaceArea * (1 + waste)).toFixed(1));
}

export function calculateDerivedQuantities({ floorArea, wetArea, garageArea, externalWallLength, ceilingHeight }) {
  const fa = parseFloat(floorArea) || 0;
  const wa = parseFloat(wetArea) || 0;
  const ga = parseFloat(garageArea) || 0;
  const ewl = parseFloat(externalWallLength) || 0;
  const ch = parseFloat(ceilingHeight) || 0;

  let slabVolume = '';
  let roofArea = '';
  let externalWallArea = '';
  let mainFloorCoverings = '';

  if (fa > 0) {
    slabVolume = (fa * 0.1).toFixed(1);
    const rawRoof = (fa * 0.6) + fa;
    roofArea = String(Math.ceil(rawRoof / 5) * 5);
    
    const coverings = fa - wa - ga;
    if (coverings > 0) {
      mainFloorCoverings = coverings.toFixed(1);
    }
  }

  if (ewl > 0 && ch > 0) {
    const gross = ewl * (ch / 1000);
    externalWallArea = (gross * 0.85).toFixed(1);
  }

  return {
    slabVolume,
    roofArea,
    externalWallArea,
    mainFloorCoverings
  };
}

export function calculateSilentCosts({
  subtotal, city, state, externalWallLength, floorArea, storeys,
  REGIONAL_FEE_MULTIPLIER, COUNCIL_FEE_BASE
}) {
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
  
  return {
    gutterLength,
    gutter: gutterCost,
    design: designFees,
    engineering: engineeringFees,
    council: councilFees,
    scaffolding: scaffoldingCost,
    total: gutterCost + designFees + engineeringFees + councilFees + scaffoldingCost
  };
}

export function toNumber(value, fallback = 0) {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

export function roundCurrency(value) {
  return Math.round((toNumber(value, 0) + Number.EPSILON) * 100) / 100;
}

function normaliseText(value = '') {
  return String(value).toLowerCase().trim();
}

export function getDeterministicQuantityForLineItem(item, quantities = {}) {
  const text = `${item.category || ''} ${item.item_name || ''}`.toLowerCase();
  const unit = normaliseText(item.unit);

  const has = (v) => toNumber(v, 0) > 0;

  // Roof sheeting/tiles/roof covering should use the roof allowance area where available.
  if (/roof|colorbond|metal deck|roof sheet|roof tile|terracotta|concrete tile/.test(text)) {
    if (has(quantities.roofAllowanceArea)) return { quantity: toNumber(quantities.roofAllowanceArea), unit: 'm²', source: 'roofAllowanceArea' };
    if (has(quantities.roofArea)) return { quantity: toNumber(quantities.roofArea), unit: 'm²', source: 'roofArea' };
  }

  // Ceiling/plasterboard.
  if (/ceiling|plasterboard ceiling|gyprock ceiling/.test(text) && has(quantities.ceilingArea)) {
    return { quantity: toNumber(quantities.ceilingArea), unit: 'm²', source: 'ceilingArea' };
  }

  // Main floor finishes.
  if (/floor finish|floor covering|tiles|timber floor|hybrid|vinyl|carpet|laminate|stone flooring/.test(text) && has(quantities.mainFloorCoverings)) {
    return { quantity: toNumber(quantities.mainFloorCoverings), unit: 'm²', source: 'mainFloorCoverings' };
  }

  // Wet-area finishes/waterproofing.
  if (/wet area|bathroom|ensuite|laundry|waterproof|wall tile|floor tile/.test(text) && has(quantities.wetArea)) {
    return { quantity: toNumber(quantities.wetArea), unit: 'm²', source: 'wetArea' };
  }

  // Garage floor area.
  if (/garage/.test(text) && has(quantities.garageArea) && unit.includes('m')) {
    return { quantity: toNumber(quantities.garageArea), unit: 'm²', source: 'garageArea' };
  }

  // Patio/porch areas.
  if (/patio|alfresco/.test(text) && has(quantities.patioArea)) {
    return { quantity: toNumber(quantities.patioArea), unit: 'm²', source: 'patioArea' };
  }

  if (/porch|verandah|veranda/.test(text) && has(quantities.porchArea)) {
    return { quantity: toNumber(quantities.porchArea), unit: 'm²', source: 'porchArea' };
  }

  // External walls / cladding / brickwork / render.
  if (/external wall|cladding|brick veneer|double brick|render|weatherboard|hebel|aac/.test(text) && has(quantities.externalWallArea)) {
    return { quantity: toNumber(quantities.externalWallArea), unit: 'm²', source: 'externalWallArea' };
  }

  // Concrete slab by volume if item is clearly volumetric.
  if (/slab|concrete/.test(text) && /m3|m³|cubic/.test(unit) && has(quantities.slabVolume)) {
    return { quantity: toNumber(quantities.slabVolume), unit: 'm³', source: 'slabVolume' };
  }

  return null;
}

export function normaliseEstimateResult(rawResult = {}, {
  difficultyPercent = 0,
  storeys,
  quantities = {}
} = {}) {
  const originalItems = Array.isArray(rawResult.line_items) ? rawResult.line_items : [];

  const parsedStoreys = parseInt(storeys, 10);
  const isMultiStorey = Number.isFinite(parsedStoreys) && parsedStoreys >= 2;

  const normalisedItems = originalItems
    .filter(Boolean)
    // Avoid duplicate scaffolding because calculateSilentCosts already adds scaffolding for 2+ storeys.
    .filter((item) => !/scaffold/i.test(`${item.category || ''} ${item.item_name || ''}`))
    .map((item) => {
      const override = getDeterministicQuantityForLineItem(item, quantities);
      const quantity = override ? override.quantity : toNumber(item.quantity, 0);
      const unit = override ? override.unit : (item.unit || 'each');
      const unitCost = toNumber(item.unit_cost, 0);
      const totalCost = roundCurrency(quantity * unitCost);

      return {
        ...item,
        quantity,
        unit,
        unit_cost: unitCost,
        total_cost: totalCost,
        quantity_source: override ? override.source : (item.quantity_source || 'ai')
      };
    });

  const subtotal = roundCurrency(normalisedItems.reduce((sum, item) => sum + toNumber(item.total_cost, 0), 0));
  const siteDifficultyMarkupCost = roundCurrency(subtotal * (toNumber(difficultyPercent, 0) / 100));
  const grandTotal = roundCurrency(subtotal + siteDifficultyMarkupCost);

  const assumptions = Array.isArray(rawResult.assumptions) ? [...rawResult.assumptions] : [];
  assumptions.push('Estimator post-processing recalculated line item totals, subtotal, site difficulty markup and grand total deterministically.');
  assumptions.push('Scaffolding is handled by the auto-calculated silent costs section to avoid duplicate allowance.');

  return {
    ...rawResult,
    line_items: normalisedItems,
    subtotal,
    scaffolding_included: isMultiStorey,
    site_difficulty_markup_cost: siteDifficultyMarkupCost,
    grand_total: grandTotal,
    assumptions
  };
}
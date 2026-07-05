
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

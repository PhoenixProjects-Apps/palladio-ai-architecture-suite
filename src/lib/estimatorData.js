export const SITE_DIFFICULTY_RATES = Object.freeze({
  'Level / Standard': 0,
  'Sloping / Moderate': 10,
  'Steep / Difficult': 20,
  'Extreme / Restricted Access': 30
});

export const CITY_OPTIONS = Object.freeze({
  'NSW': ['Sydney City', 'Outer Suburbs', 'Regional'],
  'VIC': ['Melbourne City', 'Outer Suburbs', 'Regional'],
  'QLD': ['Brisbane', 'Gold Coast', 'Northern QLD', 'Regional'],
  'WA': ['Perth', 'Outer Suburbs', 'Regional'],
  'SA': ['Adelaide', 'Regional'],
  'TAS': ['Hobart', 'Regional'],
  'ACT': ['Canberra'],
  'NT': ['Darwin', 'Regional']
});

export const STATES = Object.freeze(['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']);
export const STOREYS_OPTIONS = Object.freeze(['1', '2', '3', '4+']);
export const ROOF_MATERIALS = Object.freeze(['Colorbond Steel', 'Concrete Tile', 'Terracotta Tile', 'Slate', 'Metal Deck', 'Flat Membrane']);
export const EXTERNAL_WALL_MATERIALS = Object.freeze(['Brick Veneer', 'Double Brick', 'Weatherboard', 'Hebel (AAC)', 'Rendered Foam', 'Concrete Block', 'Cladding']);
export const FLOOR_FINISHES = Object.freeze(['Tiles', 'Timber', 'Carpet', 'Polished Concrete', 'Hybrid Vinyl', 'Stone', 'Laminate']);
export const FINISH_LEVELS_OPTIONS = Object.freeze(['Low', 'Medium', 'High']);

export const REGIONAL_COST_RATES = Object.freeze({
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
});

export const FINISH_MULTIPLIERS = Object.freeze({
  'Low': 0.85,
  'Medium': 1.0,
  'High': 1.25
});

export const COUNCIL_FEE_BASE = Object.freeze({
  'NSW': 5500, 'VIC': 4800, 'QLD': 4200, 'WA': 4500,
  'SA': 4000, 'TAS': 3800, 'ACT': 5200, 'NT': 4600
});

export const REGIONAL_FEE_MULTIPLIER = Object.freeze({
  'Sydney City': 1.15, 'Melbourne City': 1.1, 'Brisbane': 1.1,
  'Gold Coast': 1.05, 'Northern QLD': 0.95, 'Perth': 1.05,
  'Adelaide': 1.0, 'Hobart': 0.95, 'Canberra': 1.1, 'Darwin': 1.05,
  'Outer Suburbs': 1.0, 'Regional': 0.9
});

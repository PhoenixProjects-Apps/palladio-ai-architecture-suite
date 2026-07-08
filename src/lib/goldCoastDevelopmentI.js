export const GOLD_COAST_DEVELOPMENT_I_URL = 'https://developmenti.goldcoast.qld.gov.au/';

export const GOLD_COAST_DEVELOPMENT_I_SOURCE = {
  name: 'Open Development.i property search',
  link: GOLD_COAST_DEVELOPMENT_I_URL
};

const GOLD_COAST_SUBURBS = [
  'advancetown', 'arundel', 'ashmore', 'biggera waters', 'bilinga', 'bonogin', 'broadbeach',
  'broadbeach waters', 'bundall', 'burleigh heads', 'burleigh waters', 'carrara', 'clear island waters',
  'coolangatta', 'coombabah', 'coomera', 'currumbin', 'currumbin valley', 'currumbin waters',
  'elanora', 'helensvale', 'highland park', 'hollywell', 'hope island', 'jacobs well', 'labrador',
  'main beach', 'maudsland', 'mermaid beach', 'mermaid waters', 'miami', 'molendinar', 'mudgeeraba',
  'nerang', 'nobbys beach', 'ormeau', 'oxenford', 'pacific pines', 'palm beach', 'paradise point',
  'parkwood', 'pimpama', 'reedy creek', 'robina', 'runaway bay', 'southport', 'surfers paradise',
  'tallebudgera', 'tugun', 'varsity lakes', 'worongary'
];

const normaliseContext = (values) => values
  .filter(Boolean)
  .map((value) => typeof value === 'string' ? value : JSON.stringify(value))
  .join(' ')
  .toLowerCase();

export function isGoldCoastPropertyContext(...values) {
  const text = normaliseContext(values);
  if (!text) return false;
  if (text.includes('city of gold coast') || text.includes('gold coast qld') || text.includes('gold coast, qld')) return true;
  if (text.includes('gold coast') && (text.includes('qld') || text.includes('queensland') || text.includes('australia'))) return true;
  const hasQueenslandContext = text.includes('qld') || text.includes('queensland') || text.includes('australia');
  return hasQueenslandContext && GOLD_COAST_SUBURBS.some((suburb) => text.includes(suburb));
}

export function withGoldCoastDevelopmentISource(links = [], ...context) {
  const safeLinks = Array.isArray(links) ? links.filter(Boolean) : [];
  if (!isGoldCoastPropertyContext(...context)) return safeLinks;
  const alreadyIncluded = safeLinks.some((link) =>
    String(link?.link || '').includes('developmenti.goldcoast.qld.gov.au') ||
    String(link?.name || '').toLowerCase().includes('development.i')
  );
  return alreadyIncluded ? safeLinks : [GOLD_COAST_DEVELOPMENT_I_SOURCE, ...safeLinks];
}

export function appendGoldCoastDevelopmentINote(note = '', ...context) {
  if (!isGoldCoastPropertyContext(...context)) return note || '';
  const addition = 'For Gold Coast properties, manually verify property/application history and basic property information in City of Gold Coast Development.i.';
  if (String(note || '').includes('Development.i')) return note || '';
  return [note, addition].filter(Boolean).join(' ');
}

export function addGoldCoastDevelopmentISourceToPropertyData(data = {}, ...context) {
  if (!isGoldCoastPropertyContext(data, ...context)) return data;
  const sourceLinks = withGoldCoastDevelopmentISource(data.source_links, data, ...context);
  const verificationNotes = appendGoldCoastDevelopmentINote(data.verification_notes, data, ...context);
  const councilText = String(data.council_overlays_text || '');
  const developmentINote = 'Local source: City of Gold Coast Development.i for development application history, referral agency/building/application information, and basic property information.';
  return {
    ...data,
    source_links: sourceLinks,
    verification_notes: verificationNotes,
    council_overlays_text: councilText.includes('Development.i')
      ? councilText
      : [councilText, developmentINote].filter(Boolean).join('; ')
  };
}
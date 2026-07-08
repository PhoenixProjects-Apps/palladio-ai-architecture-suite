import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    
    const { address } = await req.json().catch(() => ({}));

    if (!address) return Response.json({ error: "Address is required" }, { status: 400 });

    const GOLD_COAST_DEVELOPMENT_I_URL = 'https://developmenti.goldcoast.qld.gov.au/';
    const GOLD_COAST_DEVELOPMENT_I_SOURCE = {
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
    const normaliseContext = (values) => values.filter(Boolean).map((value) => typeof value === 'string' ? value : JSON.stringify(value)).join(' ').toLowerCase();
    const isGoldCoastPropertyContext = (...values) => {
      const text = normaliseContext(values);
      if (!text) return false;
      if (text.includes('city of gold coast') || text.includes('gold coast qld') || text.includes('gold coast, qld')) return true;
      if (text.includes('gold coast') && (text.includes('qld') || text.includes('queensland') || text.includes('australia'))) return true;
      const hasQueenslandContext = text.includes('qld') || text.includes('queensland') || text.includes('australia');
      return hasQueenslandContext && GOLD_COAST_SUBURBS.some((suburb) => text.includes(suburb));
    };
    const withGoldCoastDevelopmentISource = (links = [], ...context) => {
      const safeLinks = Array.isArray(links) ? links.filter(Boolean) : [];
      if (!isGoldCoastPropertyContext(...context)) return safeLinks;
      const exists = safeLinks.some((link) => String(link?.link || '').includes('developmenti.goldcoast.qld.gov.au') || String(link?.name || '').toLowerCase().includes('development.i'));
      return exists ? safeLinks : [GOLD_COAST_DEVELOPMENT_I_SOURCE, ...safeLinks];
    };
    const appendGoldCoastDevelopmentINote = (note = '', ...context) => {
      if (!isGoldCoastPropertyContext(...context)) return note || '';
      const addition = 'For Gold Coast properties, manually verify property/application history and basic property information in City of Gold Coast Development.i.';
      if (String(note || '').includes('Development.i')) return note || '';
      return [note, addition].filter(Boolean).join(' ');
    };
    const addGoldCoastDevelopmentISourceToPropertyData = (data = {}, ...context) => {
      if (!isGoldCoastPropertyContext(data, ...context)) return data;
      const councilText = String(data.council_overlays_text || '');
      const developmentINote = 'Local source: City of Gold Coast Development.i for development application history, referral agency/building/application information, and basic property information.';
      return {
        ...data,
        source_links: withGoldCoastDevelopmentISource(data.source_links, data, ...context),
        verification_notes: appendGoldCoastDevelopmentINote(data.verification_notes, data, ...context),
        council_overlays_text: councilText.includes('Development.i') ? councilText : [councilText, developmentINote].filter(Boolean).join('; ')
      };
    };

    const isShallowLegacyCache = (record) => {
      const text = record?.council_overlays_text || '';
      return (
        (!record?.overlays || record.overlays.length === 0) &&
        !record?.neighbourhood_plan &&
        !record?.overlay_confidence &&
        (
          text.includes('No bushfire') ||
          text.includes('No flood') ||
          text.includes('No heritage')
        )
      );
    };

    // Check if the property data is already cached
    const cached = await base44.asServiceRole.entities.PropertyCache.filter({ address });
    if (cached && cached.length > 0 && !isShallowLegacyCache(cached[0])) {
      const hydrated = addGoldCoastDevelopmentISourceToPropertyData(cached[0], address);
      if (hydrated !== cached[0]) {
        void base44.asServiceRole.entities.PropertyCache.update(cached[0].id, {
          source_links: hydrated.source_links,
          verification_notes: hydrated.verification_notes,
          council_overlays_text: hydrated.council_overlays_text
        }).catch((err) => console.error('Failed to update Gold Coast Development.i source metadata:', err));
      }
      return Response.json({ data: hydrated, cached: true });
    }

    // Not in cache, fetch using LLM and internet context
    const buildPropertyResearchPrompt = (addr) => `
You are a property research assistant retrieving OFFICIAL Australian planning scheme data.

Research this property address:
${addr}

Use current public sources where available, including:
- the relevant local council planning scheme
- the council interactive mapping / property search tool
- state planning / title-style public information where available
- official development application form pages

CRITICAL REQUIREMENTS:

${isGoldCoastPropertyContext(addr) ? 'For Gold Coast / City of Gold Coast properties, use City of Gold Coast Development.i (https://developmenti.goldcoast.qld.gov.au/) as an official local source for development application history, referral agency assessments, building/application information, and basic property information. Include it in source_links as the base portal URL only; do not invent direct query URLs. Keep City Plan/ePlan zoning and overlays as separate planning scheme verification sources.' : ''}

  1. ZONING
Return the EXACT, SPECIFIC zone name used by the local planning scheme.
For Brisbane City Council under City Plan 2014, examples include:
- Low density residential zone
- Low-medium density residential zone
- Medium density residential zone
- Character residential zone
- Rural residential zone
- Mixed use zone
- Centre zone
- Community facilities zone
- Emerging community zone

Do NOT return generic labels like:
- Residential
- General Residential
- Housing
- Urban

If the exact zone cannot be verified, return:
"UNVERIFIED - manual confirmation required"

2. NEIGHBOURHOOD / LOCAL PLAN
Check whether the address is inside a neighbourhood plan, local plan, precinct, locality plan, or equivalent local planning area.
Return the exact name if verified.
If none is found, return:
"None verified"
If uncertain, return:
"UNVERIFIED - check council mapping tool"

3. POSITIVE OVERLAYS
Explicitly check these overlay categories one by one:
- Flood
- Bushfire
- Heritage / Traditional building character
- Airport environs / ANEF / OLS
- Road hierarchy / transport corridor
- Bicycle network
- Waterway corridor
- Biodiversity / environmental significance
- Landslide / steep land / slope constraint
- Coastal hazard
- Extractive resources
- Infrastructure / trunk infrastructure
- Acid sulfate soils
- Stormwater / overland flow
- Any other mapped local council overlay

Only include an overlay in "overlays" if there is genuine evidence it applies.

4. NEGATIVE OVERLAY CHECKS
If a major overlay category is checked and does NOT apply, store that as a negative check.
Example:
"No flood overlay detected"
"No bushfire overlay detected"
"No heritage overlay detected"

Do not confuse negative checks with positive overlays.

5. EMPTY OVERLAY RULE
If positive overlays cannot be confidently verified, DO NOT return an empty overlays array without explanation.
Instead:
overlays: ["UNVERIFIED - check council mapping tool"]
overlay_confidence: "LOW"

6. LOT / RP / SITE AREA
Return:
- lot_rp
- lot_no
- rp_no
- site_area

7. FORMS AND APPLICATIONS
Return links to the relevant local council's actual development application forms and property/planning search tools.

8. SOURCE LINKS
Return useful source links used or recommended, including council mapping/property search pages.

Return ONLY valid JSON matching this exact structure.
`;

    const responseSchema = {
      type: "object",
      properties: {
        lot_rp: { type: "string" },
        lot_no: { type: "string" },
        rp_no: { type: "string" },
        site_area: { type: "string" },
        zoning: { type: "string" },
        zoning_confidence: { type: "string" },
        neighbourhood_plan: { type: "string" },
        overlays: { type: "array", items: { type: "string" } },
        negative_overlay_checks: { type: "array", items: { type: "string" } },
        overlay_confidence: { type: "string" },
        forms_and_applications: {
          type: "array",
          items: {
            type: "object",
            properties: { name: { type: "string" }, link: { type: "string" } },
            required: ["name", "link"]
          }
        },
        source_links: {
          type: "array",
          items: {
            type: "object",
            properties: { name: { type: "string" }, link: { type: "string" } },
            required: ["name", "link"]
          }
        },
        verification_notes: { type: "string" }
      },
      required: ["lot_rp", "lot_no", "rp_no", "site_area", "zoning", "zoning_confidence", "neighbourhood_plan", "overlays", "negative_overlay_checks", "overlay_confidence", "forms_and_applications", "source_links", "verification_notes"]
    };

    const prompt = buildPropertyResearchPrompt(address);

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      model: 'gemini_3_flash', // Standard fast model that supports internet context
      response_json_schema: responseSchema
    });

    const buildCouncilOverlaysText = (data = {}) => {
      const parts = [];

      if (data.zoning) {
        parts.push(`Zoning: ${data.zoning}`);
      }

      if (data.zoning_confidence) {
        parts.push(`Zoning confidence: ${data.zoning_confidence}`);
      }

      if (data.neighbourhood_plan) {
        parts.push(`Neighbourhood / Local Plan: ${data.neighbourhood_plan}`);
      }

      if (Array.isArray(data.overlays) && data.overlays.length > 0) {
        parts.push(`Positive overlays: ${data.overlays.join(', ')}`);
      } else {
        parts.push(`Positive overlays: UNVERIFIED - check council mapping tool`);
      }

      if (Array.isArray(data.negative_overlay_checks) && data.negative_overlay_checks.length > 0) {
        parts.push(`Negative overlay checks: ${data.negative_overlay_checks.join('; ')}`);
      }

      if (data.overlay_confidence) {
        parts.push(`Overlay confidence: ${data.overlay_confidence}`);
      }

      if (data.verification_notes) {
        parts.push(`Verification notes: ${data.verification_notes}`);
      }

      return parts.join('; ');
    };

    const assembledCouncilText = buildCouncilOverlaysText(result);

    const newData = {
      address,
      lot_no: result.lot_no || '',
      rp_no: result.rp_no || '',
      lot_rp: result.lot_rp || '',
      site_area: result.site_area || '',
      zoning: result.zoning || '',
      zoning_confidence: result.zoning_confidence || '',
      neighbourhood_plan: result.neighbourhood_plan || '',
      overlays: result.overlays || [],
      negative_overlay_checks: result.negative_overlay_checks || [],
      overlay_confidence: result.overlay_confidence || '',
      council_overlays_text: assembledCouncilText,
      forms_and_applications: result.forms_and_applications || [],
      source_links: result.source_links || [],
      last_verified_at: new Date().toISOString(),
      verification_notes: result.verification_notes || ''
    };

    const finalData = addGoldCoastDevelopmentISourceToPropertyData(newData, address, result);

    // Save to cache for future requests
    const saved = await base44.asServiceRole.entities.PropertyCache.create(finalData);

    return Response.json({ data: saved, cached: false });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
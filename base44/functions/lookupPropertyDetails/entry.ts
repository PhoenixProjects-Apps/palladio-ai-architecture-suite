import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { address } = await req.json().catch(() => ({}));

    if (!address) return Response.json({ error: "Address is required" }, { status: 400 });

    // Check if the property data is already cached
    const cached = await base44.asServiceRole.entities.PropertyCache.filter({ address });
    if (cached && cached.length > 0) {
      return Response.json({ data: cached[0], cached: true });
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

    // Automatically assemble a comprehensive text summary for downstream features
    const assembledCouncilText = [
      `Zoning: ${result.zoning || 'Unverified'}`,
      `Neighbourhood Plan: ${result.neighbourhood_plan || 'None'}`,
      `Positive Overlays: ${(result.overlays || []).join(', ') || 'None mapped'}`,
      `Negative Hazard Checks: ${(result.negative_overlay_checks || []).join(', ') || 'None'}`
    ].join(' | ');

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

    // Save to cache for future requests
    const saved = await base44.asServiceRole.entities.PropertyCache.create(newData);

    return Response.json({ data: saved, cached: false });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
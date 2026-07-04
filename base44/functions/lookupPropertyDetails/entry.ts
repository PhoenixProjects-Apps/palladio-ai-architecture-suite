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
    const prompt = `Search public council information and property databases for the Australian address: "${address}".
Find and return:
1. Lot Number
2. Registered Plan (RP) number
3. Combined Lot & RP (e.g., Lot 1 RP 12345)
4. Site / lot area in square metres
5. Exact zoning description and your confidence level in this zoning.
6. Neighbourhood plan or local plan area.
7. Positive overlays found (council planning overlays that actually apply to the site).
8. Negative overlay checks (hazards you explicitly checked and confirmed DO NOT apply, e.g., 'No flood overlay', 'No bushfire').
9. Overall overlay confidence.
10. A fully assembled summary text (council_overlays_text) combining zoning, neighbourhood plan, positive overlays, and negative overlay checks into a comprehensive paragraph. Do NOT just list negative checks here.
11. Links to relevant local council forms and applications for development.
12. Links to the exact sources where you verified this information.
13. Any verification notes (e.g., issues finding data) and a timestamp.

Return exactly what you find from official sources. Use an empty string for any field you cannot confirm. Do not invent values.`;

    const responseSchema = {
      type: "object",
      properties: {
        lot_no: { type: "string" },
        rp_no: { type: "string" },
        lot_rp: { type: "string" },
        site_area: { type: "string" },
        zoning: { type: "string" },
        zoning_confidence: { type: "string" },
        neighbourhood_plan: { type: "string" },
        overlays: { type: "array", items: { type: "string" } },
        negative_overlay_checks: { type: "array", items: { type: "string" } },
        overlay_confidence: { type: "string" },
        council_overlays_text: { type: "string" },
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
        last_verified_at: { type: "string" },
        verification_notes: { type: "string" }
      },
      required: ["lot_no", "rp_no", "lot_rp", "site_area", "zoning", "zoning_confidence", "neighbourhood_plan", "overlays", "negative_overlay_checks", "overlay_confidence", "council_overlays_text", "forms_and_applications", "source_links", "last_verified_at", "verification_notes"]
    };

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      model: 'gemini_3_flash', // Standard fast model that supports internet context
      response_json_schema: responseSchema
    });

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
      council_overlays_text: result.council_overlays_text || '',
      forms_and_applications: result.forms_and_applications || [],
      source_links: result.source_links || [],
      last_verified_at: result.last_verified_at || new Date().toISOString(),
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
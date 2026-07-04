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
5. Zoning description
6. Council planning overlays and zoning that apply to the site (e.g. flood overlay, bushfire, character, neighbourhood plan, etc.) - provide a single combined string, and a separate array of strings.
7. Links to relevant local council forms and applications for development.

Return exactly what you find from official sources. Use an empty string for any field you cannot confirm. Do not invent values.`;

    const responseSchema = {
      type: "object",
      properties: {
        lot_no: { type: "string" },
        rp_no: { type: "string" },
        lot_rp: { type: "string" },
        site_area: { type: "string" },
        zoning: { type: "string" },
        council_overlays_text: { type: "string" },
        overlays: { type: "array", items: { type: "string" } },
        forms_and_applications: {
          type: "array",
          items: {
            type: "object",
            properties: { name: { type: "string" }, link: { type: "string" } },
            required: ["name", "link"]
          }
        }
      },
      required: ["lot_no", "rp_no", "lot_rp", "site_area", "zoning", "council_overlays_text", "overlays", "forms_and_applications"]
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
      council_overlays_text: result.council_overlays_text || '',
      overlays: result.overlays || [],
      forms_and_applications: result.forms_and_applications || []
    };

    // Save to cache for future requests
    const saved = await base44.asServiceRole.entities.PropertyCache.create(newData);

    return Response.json({ data: saved, cached: false });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
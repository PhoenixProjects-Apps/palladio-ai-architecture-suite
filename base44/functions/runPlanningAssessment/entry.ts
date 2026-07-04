import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let user;
    try {
      user = await base44.auth.me();
    } catch (_) {
      user = null;
    }
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    const address = body?.address || 'Unknown Address';
    const devType = body?.devType || 'Unknown Development Type';
    const description = body?.description || 'No description provided';
    const propertyData = body?.propertyData || {};

    const overlaysString = Array.isArray(propertyData.overlays)
      ? propertyData.overlays.join(', ')
      : (propertyData.overlays || 'N/A');

    const negativeChecksString = Array.isArray(propertyData.negative_overlay_checks)
      ? propertyData.negative_overlay_checks.join('; ')
      : (propertyData.negative_overlay_checks || 'N/A');

    const councilOverlaysText =
      propertyData.council_overlays_text ||
      [
        propertyData.zoning ? `Zoning: ${propertyData.zoning}` : null,
        propertyData.neighbourhood_plan ? `Neighbourhood / Local Plan: ${propertyData.neighbourhood_plan}` : null,
        overlaysString && overlaysString !== 'N/A' ? `Positive Overlays: ${overlaysString}` : null,
        negativeChecksString && negativeChecksString !== 'N/A' ? `Negative Overlay Checks: ${negativeChecksString}` : null,
        propertyData.overlay_confidence ? `Overlay Confidence: ${propertyData.overlay_confidence}` : null
      ].filter(Boolean).join('; ');

    const prompt = `You are a town planning assessor. Apply standard town planning assessment rules to assess this proposed development:

Address: ${address}
Development Type: ${devType}
Description: ${description}

Known property context:
- Lot / RP: ${propertyData.lot_rp || 'N/A'}
- Lot No.: ${propertyData.lot_no || 'N/A'}
- RP No.: ${propertyData.rp_no || 'N/A'}
- Site Area: ${propertyData.site_area || 'N/A'}
- Zoning: ${propertyData.zoning || 'N/A'}
- Zoning Confidence: ${propertyData.zoning_confidence || 'N/A'}
- Neighbourhood / Local Plan: ${propertyData.neighbourhood_plan || 'N/A'}
- Council Overlays Summary: ${councilOverlaysText}
- Positive Overlays: ${overlaysString}
- Negative Overlay Checks: ${negativeChecksString}

Important:
Do not treat "No flood, bushfire, or heritage overlays detected" as meaning no planning overlays exist.
If overlay_confidence is LOW or overlays include "UNVERIFIED", explicitly flag that manual council mapping verification is required.
`;

    const responseSchema = {
      type: "object",
      properties: {
        verdict: { type: "string", enum: ["LIKELY PERMITTED", "APPROVAL REQUIRED", "LIKELY REFUSED", "COMPLEX - SEEK ADVICE"] },
        verdict_reason: { type: "string", description: "Short explanation of the verdict" },
        zoning_assessment: { type: "string", description: "Markdown text about zoning compatibility" },
        planning_controls: { type: "string", description: "Markdown text about relevant codes" },
        overlays: { type: "string", description: "Markdown text about overlays (heritage, bushfire, etc)" },
        issues: { type: "array", items: { type: "string" }, description: "List of issues" },
        neighbour_impact: { type: "string", description: "Markdown text about impact on neighbours" },
        application_requirements: { type: "string", description: "Markdown text about what to submit" },
        recommendations: { type: "array", items: { type: "string" }, description: "List of recommendations" },
        red_flags: { type: "array", items: { type: "string" }, description: "List of red flags" },
        disclaimer: { type: "string", description: "Standard disclaimer" }
      },
      required: ["verdict", "verdict_reason", "zoning_assessment", "planning_controls", "overlays", "issues", "neighbour_impact", "application_requirements", "recommendations", "red_flags", "disclaimer"]
    };

    const assessment = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      response_json_schema: responseSchema
    });

    return Response.json({ output: assessment }, { status: 200 });
  } catch (error) {
    console.error("runPlanningAssessment error:", error);
    return Response.json({ error: "Internal Assessment Engine Exception" }, { status: 500 });
  }
});
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

    const prompt = `You are a town planning assessor. Apply standard town planning assessment rules to assess this proposed development:
Address: ${address}
Development Type: ${devType}
Description: ${description}

Known property context:
- Lot / RP: ${propertyData.lot_rp || 'N/A'}
- Site Area: ${propertyData.site_area || 'N/A'}
- Zoning: ${propertyData.zoning || 'N/A'}
- Property Overlays: ${overlaysString}

You may also search the web to review the specific council planning schemes and codes relevant to this address to verify your assessment.
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

    const jsonPrompt = prompt + `\n\nCRITICAL: Return ONLY valid JSON matching this schema: ${JSON.stringify(responseSchema)}`;

    const responseData = await base44.functions.invoke('superagentInvoke', {
      input: jsonPrompt
    });

    if (responseData.data?.error) {
      throw new Error(responseData.data.error);
    }

    return Response.json({ output: responseData.data?.output || "" }, { status: 200 });
  } catch (error) {
    console.error("runPlanningAssessment error:", error);
    return Response.json({ error: "Internal Assessment Engine Exception" }, { status: 500 });
  }
});
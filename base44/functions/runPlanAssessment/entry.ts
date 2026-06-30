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
    const action = body?.action || 'run';
    if (action !== 'run') {
      return Response.json({ error: "Unknown action" }, { status: 400 });
    }

    const fileUrl = body?.fileUrl;
    const tier = body?.tier;
    if (!fileUrl) {
      return Response.json({ error: "Missing fileUrl" }, { status: 400 });
    }
    
    try {
      const urlObj = new URL(fileUrl);
      // Removed restrict domain check as it blocked base44 media domains and the LLM handles safety.
    } catch {
      return Response.json({ error: 'Invalid fileUrl format' }, { status: 400 });
    }

    const tierLabel = tier === 'construction'
      ? 'Tier 2 (Construction & Compliance Documentation Review)'
      : 'Tier 1 (Concept & Pricing Review)';

    const pd = body?.projectDetails || {};
    const pdLines = [];
    if (pd.projectName) pdLines.push(`- Project Name: ${pd.projectName}`);
    if (pd.clientName) pdLines.push(`- Client Name: ${pd.clientName}`);
    if (pd.address) pdLines.push(`- Site Address: ${pd.address}`);
    if (pd.lotNo) pdLines.push(`- Lot No.: ${pd.lotNo}`);
    if (pd.rpNo) pdLines.push(`- RP No.: ${pd.rpNo}`);
    if (pd.siteArea) pdLines.push(`- Site Area: ${pd.siteArea}`);
    if (pd.councilOverlays) pdLines.push(`- Council Overlays: ${pd.councilOverlays}`);
    const projectContext = pdLines.length
      ? `\n\nProject context:\n${pdLines.join('\n')}`
      : '';

    const instruction = `Please perform a ${tierLabel} assessment on the attached architectural plan.${projectContext}

If the attached file is clearly not a development layout or architectural sheet drawing, set overall_score to 0.`;

    const responseSchema = {
      type: "object",
      properties: {
        project_info: {
          type: "object",
          properties: {
            project_name: { type: "string" },
            client_name: { type: "string" },
            address: { type: "string" },
            lot_no: { type: "string" },
            rp_no: { type: "string" },
            site_area: { type: "string" },
            council_overlays: { type: "string" }
          }
        },
        plan_type: { type: "string", description: "string matching the drawing classification" },
        overall_score: { type: "integer", description: "0-10" },
        overview: { type: "string", description: "high-level overview text" },
        spatial_analysis: { type: "string", description: "spatial utilisation details" },
        design_observations: { type: "array", items: { type: "string" }, description: "bullet points of observations" },
        compliance_flags: { type: "array", items: { type: "string" }, description: "list of explicit construction code issues or safety flags found" },
        recommendations: { type: "array", items: { type: "string" }, description: "remediation suggestions" }
      },
      required: ["project_info", "plan_type", "overall_score", "overview", "spatial_analysis", "design_observations", "compliance_flags", "recommendations"]
    };

    const reply = await base44.integrations.Core.InvokeLLM({
      prompt: instruction,
      file_urls: [fileUrl],
      response_json_schema: responseSchema
    });

    return Response.json({ output: reply }, { status: 200 });
  } catch (error) {
    console.error("runPlanAssessment error:", error);
    return Response.json({ error: "Internal Assessment Engine Exception" }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);

    if (!user) return Response.json({ error: "Unauthorized access" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const fileUrl = body?.fileUrl;

    if (body?.action !== 'run') return Response.json({ error: "Invalid action" }, { status: 400 });

    try {
      const consumeRes = await base44.functions.invoke('consumeToken', { amount: 1 });
      if (!consumeRes.data || !consumeRes.data.success) {
        return Response.json({ error: "Insufficient tokens" }, { status: 403 });
      }
    } catch (err) {
      return Response.json({ error: err.response?.data?.error || "Insufficient tokens" }, { status: 403 });
    }
    if (!fileUrl) return Response.json({ error: "A valid file URL is required" }, { status: 400 });

    const tierLabel = body?.tier === 'construction'
      ? 'Tier 2 (Construction & Compliance Documentation Review)'
      : 'Tier 1 (Concept & Pricing Review)';

    const pd = body?.projectDetails || {};
    const sanitize = (str) => (str ? String(str).substring(0, 200) : '');
    const pdLines = [];
    if (pd.projectName) pdLines.push(`- Project Name: ${sanitize(pd.projectName)}`);
    if (pd.clientName) pdLines.push(`- Client Name: ${sanitize(pd.clientName)}`);
    if (pd.address) pdLines.push(`- Site Address: ${sanitize(pd.address)}`);
    if (pd.lotNo) pdLines.push(`- Lot No.: ${sanitize(pd.lotNo)}`);
    if (pd.rpNo) pdLines.push(`- RP No.: ${sanitize(pd.rpNo)}`);
    if (pd.siteArea) pdLines.push(`- Site Area: ${sanitize(pd.siteArea)}`);
    if (pd.councilOverlays) pdLines.push(`- Council Overlays: ${sanitize(pd.councilOverlays)}`);
    const projectContext = pdLines.length ? `\n\nProject context:\n${pdLines.join('\n')}` : '';

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

    const instruction = `Please perform a ${tierLabel} assessment on the attached architectural plan.${projectContext}\n\nIf the attached file is clearly not a development layout or architectural sheet drawing, set overall_score to 0.`;

    const llmResult = await base44.integrations.Core.InvokeLLM({
      prompt: instruction,
      file_urls: [fileUrl],
      response_json_schema: responseSchema,
      model: "automatic"
    });

    return Response.json({ status: "done", output: llmResult }, { status: 200 });

  } catch (error) {
    console.error("runPlanAssessment fatal error:", error);
    // Send the REAL error message to the frontend instead of a generic one
    return Response.json({ error: error.message || "Unknown backend crash" }, { status: 500 });
  }
});
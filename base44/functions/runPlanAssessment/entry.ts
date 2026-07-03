import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    
    if (!user) {
      return Response.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action || 'run';
    
    if (action !== 'run') {
      return Response.json({ error: "Invalid action specified" }, { status: 400 });
    }

    const fileUrl = body?.fileUrl;
    const tier = body?.tier;
    
    if (!fileUrl || typeof fileUrl !== 'string') {
      return Response.json({ error: "A valid file URL is required" }, { status: 400 });
    }
    
    // Security: Restrict allowed domains for the file source
    try {
      const urlObj = new URL(fileUrl);
      const allowedDomains = ['media.base44.com', 'firebasestorage.googleapis.com', 'storage.googleapis.com'];
      if (!allowedDomains.includes(urlObj.hostname)) {
        return Response.json({ error: 'Untrusted file source domain' }, { status: 403 });
      }
    } catch {
      return Response.json({ error: 'Malformed file URL' }, { status: 400 });
    }

    const tierLabel = tier === 'construction'
      ? 'Tier 2 (Construction & Compliance Documentation Review)'
      : 'Tier 1 (Concept & Pricing Review)';

    const pd = body?.projectDetails || {};
    const pdLines = [];
    
    // Security: Truncate inputs to prevent payload bloat/token exhaustion
    const sanitize = (str) => (str ? String(str).substring(0, 200) : '');
    
    if (pd.projectName) pdLines.push(`- Project Name: ${sanitize(pd.projectName)}`);
    if (pd.clientName) pdLines.push(`- Client Name: ${sanitize(pd.clientName)}`);
    if (pd.address) pdLines.push(`- Site Address: ${sanitize(pd.address)}`);
    if (pd.lotNo) pdLines.push(`- Lot No.: ${sanitize(pd.lotNo)}`);
    if (pd.rpNo) pdLines.push(`- RP No.: ${sanitize(pd.rpNo)}`);
    if (pd.siteArea) pdLines.push(`- Site Area: ${sanitize(pd.siteArea)}`);
    if (pd.councilOverlays) pdLines.push(`- Council Overlays: ${sanitize(pd.councilOverlays)}`);
    
    const projectContext = pdLines.length ? `\n\nProject context:\n${pdLines.join('\n')}` : '';

    const instruction = `Please perform a ${tierLabel} assessment on the attached architectural plan.${projectContext}\n\nIf the attached file is clearly not a development layout or architectural sheet drawing, set overall_score to 0.`;

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

    const jsonPrompt = instruction + `\n\nCRITICAL: Return ONLY valid JSON matching this schema: ${JSON.stringify(responseSchema)}`;

    // Pass to the internal AI agent
    const responseData = await base44.functions.invoke('superagentInvoke', {
      input: jsonPrompt,
      fileUrls: [fileUrl]
    });

    if (responseData.data?.error) {
      console.error("Superagent Invocation Error:", responseData.data.error);
      return Response.json({ error: "AI Engine failed to process the request" }, { status: 502 });
    }

    return Response.json({ output: responseData.data?.output || "" }, { status: 200 });
  } catch (error) {
    console.error("runPlanAssessment fatal error:", error);
    return Response.json({ error: "Internal Assessment Engine Exception" }, { status: 500 });
  }
});
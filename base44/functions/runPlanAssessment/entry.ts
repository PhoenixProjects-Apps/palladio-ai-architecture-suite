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

    const apiKey = Deno.env.get("SUPERAGENT_API_KEY");
    const agentId = Deno.env.get("SUPERAGENT_AGENT_ID");
    const baseUrl = (Deno.env.get("SUPERAGENT_BASE_URL") || "https://api.superagent.ai").replace(/\/+$/, "");
    if (!apiKey || !agentId) {
      console.error("Superagent secrets missing");
      return Response.json({ error: "Superagent not configured" }, { status: 500 });
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
      ? `\n\nProject context — use and reference these details in your assessment, and package them in the project_info field of your output:\n${pdLines.join('\n')}`
      : '';

    const instruction = `Please perform a ${tierLabel} assessment on the attached architectural plan.${projectContext}

Return your final assessment STRICTLY as a JSON object with no markdown formatting, backticks, or prose outside the JSON. Use these exact keys:
{
  "project_info": { "project_name": "...", "client_name": "...", "address": "...", "lot_no": "...", "rp_no": "...", "site_area": "...", "council_overlays": "..." },
  "plan_type": "string matching the drawing classification",
  "overall_score": <integer 0-10>,
  "overview": "high-level overview text",
  "spatial_analysis": "spatial utilisation details",
  "design_observations": ["bullet points of observations"],
  "compliance_flags": ["list of explicit construction code issues or safety flags found"],
  "recommendations": ["remediation suggestions"]
}
If the attached file is clearly not a development layout or architectural sheet drawing, set overall_score to 0.`;

    const input = `${instruction}\n\nAttached plan file (download and analyse): ${fileUrl}`;

    const apiRes = await fetch(`${baseUrl}/v1/agents/${agentId}/invoke`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ input, stream: false })
    });

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      console.error("Superagent API error:", apiRes.status, errText);
      return Response.json({ error: `Superagent API error (${apiRes.status})` }, { status: 502 });
    }

    const data = await apiRes.json();
    const output = data.output ?? data.message ?? data.response ??
      (typeof data === "string" ? data : JSON.stringify(data));

    return Response.json({ output }, { status: 200 });
  } catch (error) {
    console.error("runPlanAssessment error:", error);
    return Response.json({ error: "Internal Assessment Engine Exception" }, { status: 500 });
  }
});
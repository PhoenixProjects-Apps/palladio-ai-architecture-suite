import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    
    if (!user) return Response.json({ error: "Unauthorized access" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const fileUrl = body?.fileUrl;
    
    if (body?.action !== 'run') return Response.json({ error: "Invalid action" }, { status: 400 });
    if (!fileUrl) return Response.json({ error: "A valid file URL is required" }, { status: 400 });
    
    const apiKey = Deno.env.get("SUPERAGENT_API_KEY");
    const agentId = (Deno.env.get("SUPERAGENT_AGENT_ID") || "").replace(/[^a-f0-9]/gi, "");
    if (!apiKey || !agentId) return Response.json({ error: "AI configuration missing" }, { status: 500 });

    const tierLabel = body?.tier === 'construction' 
      ? 'Tier 2 (Construction & Compliance Documentation Review)' 
      : 'Tier 1 (Concept & Pricing Review)';

    const pd = body?.projectDetails || {};
    const sanitize = (str) => (str ? String(str).substring(0, 200) : '');
    const pdLines = [];
    if (pd.projectName) pdLines.push(`- Project Name: ${sanitize(pd.projectName)}`);
    if (pd.siteArea) pdLines.push(`- Site Area: ${sanitize(pd.siteArea)}`);
    const projectContext = pdLines.length ? `\n\nProject context:\n${pdLines.join('\n')}` : '';

    const instruction = `Please perform a ${tierLabel} assessment on the attached architectural plan.${projectContext}`;

    const baseUrl = `https://app.base44.com/api/agents/${agentId}`;
    
    // Fixed: Using api_key exactly as Superagent's FastAPI expects
    const headers = { 
      "api_key": apiKey, 
      "Content-Type": "application/json" 
    };

    // 1. Create Conversation
    const createRes = await fetch(`${baseUrl}/conversations`, { method: "POST", headers, body: "{}" });
    if (!createRes.ok) throw new Error(`Superagent API Error: ${createRes.status}`);
    const conversationId = (await createRes.json()).id;

    // 2. Track ownership for polling security
    await base44.entities.SuperagentSession.create({
      session_id: conversationId,
      owner_email: user.email
    });

    // 3. Fire and forget - DO NOT AWAIT THIS FETCH!
    const msgBody = { role: "user", content: instruction, file_urls: [fileUrl] };
    fetch(`${baseUrl}/conversations/${conversationId}/messages`, {
      method: "POST", headers, body: JSON.stringify(msgBody),
    }).catch(console.error);

    // 4. Return immediately to prevent timeout
    return Response.json({ status: "pending", session_id: conversationId }, { status: 200 });

  } catch (error) {
    console.error("runPlanAssessment fatal error:", error);
    return Response.json({ error: "Internal Assessment Engine Exception" }, { status: 500 });
  }
});
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

    const apiKey = Deno.env.get("SUPERAGENT_API_KEY");
    const agentId = (Deno.env.get("SUPERAGENT_AGENT_ID") || "").replace(/[^a-f0-9]/gi, "");
    if (!apiKey || !agentId) {
      console.error("Superagent secrets missing");
      return Response.json({ error: "Superagent not configured" }, { status: 500 });
    }
    const baseUrl = `https://app.base44.com/api/agents/${agentId}`;
    const headers = { "api_key": apiKey, "Content-Type": "application/json" };

    const overlaysString = Array.isArray(propertyData.overlays) 
      ? propertyData.overlays.join(', ') 
      : (propertyData.overlays || 'N/A');

    const instruction = `You are a town planning assessor. Apply the town planning assessment rules defined in the "town-planning-assessor.md" knowledge file to assess this proposed development:
Address: ${address}
Development Type: ${devType}
Description: ${description}

Known property context:
- Lot / RP: ${propertyData.lot_rp || 'N/A'}
- Site Area: ${propertyData.site_area || 'N/A'}
- Zoning: ${propertyData.zoning || 'N/A'}
- Property Overlays: ${overlaysString}

CRITICAL: Do NOT reply with conversational text, greetings, or commentary. Your ENTIRE reply must be a single JSON object and nothing else — no markdown, no backticks, no prose before or after it. Use these exact keys:
{
  "verdict": "LIKELY PERMITTED" | "APPROVAL REQUIRED" | "LIKELY REFUSED" | "COMPLEX - SEEK ADVICE",
  "verdict_reason": "Short explanation of the verdict",
  "zoning_assessment": "Markdown text about zoning compatibility",
  "planning_controls": "Markdown text about relevant codes",
  "overlays": "Markdown text about overlays (heritage, bushfire, etc)",
  "issues": ["Issue 1", "Issue 2"],
  "neighbour_impact": "Markdown text about impact on neighbours",
  "application_requirements": "Markdown text about what to submit",
  "recommendations": ["Rec 1", "Rec 2"],
  "red_flags": ["Flag 1"],
  "disclaimer": "Standard disclaimer"
}`;

    const createRes = await fetch(`${baseUrl}/conversations`, {
      method: "POST",
      headers,
      body: "{}",
    });
    if (!createRes.ok) {
      return Response.json({ error: `Superagent API error (${createRes.status})` }, { status: 502 });
    }
    const created = await createRes.json();
    const conversationId = created.id;

    const sendRes = await fetch(`${baseUrl}/conversations/${conversationId}/messages`, {
      method: "POST",
      headers,
      body: JSON.stringify({ role: "user", content: instruction }),
    });
    if (!sendRes.ok) {
      return Response.json({ error: `Superagent API error (${sendRes.status})` }, { status: 502 });
    }
    const afterSend = await sendRes.json();

    const countAssistant = (conv) => (conv?.messages || []).filter((m) => m.role === "assistant").length;
    const lastAssistant = (conv) => {
      const msgs = conv?.messages || [];
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === "assistant" && msgs[i].content) return msgs[i].content;
      }
      return null;
    };

    let reply = null;
    if (countAssistant(afterSend) > 0) {
      reply = lastAssistant(afterSend);
    }

    for (let i = 0; i < 25 && !reply; i++) {
      await new Promise((res) => setTimeout(res, 1500));
      const conv = await fetch(`${baseUrl}/conversations/${conversationId}`, { headers })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
      if (conv && countAssistant(conv) > 0) {
        reply = lastAssistant(conv);
      }
    }

    if (!reply) {
      return Response.json({ error: "Superagent did not return a response in time." }, { status: 504 });
    }

    let cleanReply = reply.trim();
    if (cleanReply.startsWith('```json')) {
      cleanReply = cleanReply.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    } else if (cleanReply.startsWith('```')) {
      cleanReply = cleanReply.replace(/^```\s*/, '').replace(/```$/, '').trim();
    }

    return Response.json({ output: cleanReply }, { status: 200 });
  } catch (error) {
    console.error("runPlanningAssessment error:", error);
    return Response.json({ error: "Internal Assessment Engine Exception" }, { status: 500 });
  }
});
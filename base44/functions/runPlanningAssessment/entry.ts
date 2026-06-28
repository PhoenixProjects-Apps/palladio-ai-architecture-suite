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

    const address = body?.address;
    const devType = body?.devType;
    const description = body?.description;
    if (!address || !devType || !description) {
      return Response.json({ error: "Missing address, devType or description" }, { status: 400 });
    }

    const apiKey = Deno.env.get("SUPERAGENT_API_KEY");
    const agentId = (Deno.env.get("SUPERAGENT_AGENT_ID") || "").replace(/[^a-f0-9]/gi, "");
    if (!apiKey || !agentId) {
      console.error("Superagent secrets missing");
      return Response.json({ error: "Superagent not configured" }, { status: 500 });
    }
    const baseUrl = `https://app.base44.com/api/agents/${agentId}`;
    const headers = { "api_key": apiKey, "Content-Type": "application/json" };

    const pd = body?.propertyData || {};
    const pdLines = [];
    if (pd.lot_rp) pdLines.push(`- Lot / RP: ${pd.lot_rp}`);
    if (pd.site_area) pdLines.push(`- Site Area: ${pd.site_area}`);
    if (pd.zoning) pdLines.push(`- Zoning: ${pd.zoning}`);
    if (Array.isArray(pd.overlays) && pd.overlays.length) pdLines.push(`- Property Overlays: ${pd.overlays.join(', ')}`);
    const propertyContext = pdLines.length
      ? `\n\nKnown property context (verify and build on this):\n${pdLines.join('\n')}`
      : '';

    const instruction = `Act as an expert Australian Town Planner. Assess this proposed development:
Address: ${address}
Development Type: ${devType}
Description: ${description}${propertyContext}

Search local planning schemes, zoning and overlays for this address where useful.
Return your final assessment STRICTLY as a JSON object with no markdown formatting, backticks, or prose outside the JSON. Use these exact keys:
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

    // Create a fresh one-shot conversation for each assessment.
    const createRes = await fetch(`${baseUrl}/conversations`, {
      method: "POST",
      headers,
      body: "{}",
    });
    if (!createRes.ok) {
      const t = await createRes.text();
      console.error("createConversation failed", createRes.status, t);
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
      const t = await sendRes.text();
      console.error("sendMessage failed", sendRes.status, t);
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

    for (let i = 0; i < 80 && !reply; i++) {
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

    return Response.json({ output: reply }, { status: 200 });
  } catch (error) {
    console.error("runPlanningAssessment error:", error);
    return Response.json({ error: "Internal Assessment Engine Exception" }, { status: 500 });
  }
});
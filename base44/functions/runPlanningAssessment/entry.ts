import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function looksLikeJsonOutput(text) {
  if (!text) return null;
  const tryParse = (str) => {
    try {
      const o = JSON.parse(str);
      if (o && typeof o === "object" && "verdict" in o) return str;
    } catch (_) {}
    return null;
  };
  let s = String(text).trim().replace(/```json/gi, '').replace(/```/g, '').trim();
  let p = tryParse(s); if (p) return p;
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    p = tryParse(s.slice(start, end + 1)); if (p) return p;
  }
  return null;
}

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
    const action = body?.action || 'start';

    const apiKey = Deno.env.get("SUPERAGENT_API_KEY");
    const agentId = (Deno.env.get("SUPERAGENT_AGENT_ID") || "").replace(/[^a-f0-9]/gi, "");
    if (!apiKey || !agentId) {
      console.error("Superagent secrets missing");
      return Response.json({ error: "Superagent not configured" }, { status: 500 });
    }
    const baseUrl = `https://app.base44.com/api/agents/${agentId}`;
    const headers = { "api_key": apiKey, "Content-Type": "application/json" };

    const findAssessmentJson = (msgs) => {
      if (!Array.isArray(msgs)) msgs = msgs?.messages || [];
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === "assistant" && msgs[i].content) {
          const json = looksLikeJsonOutput(msgs[i].content);
          if (json) return json;
        }
      }
      return null;
    };

    // ---- START: kick off the assessment, return conversation id immediately ----
    if (action === 'start') {
      const address = body?.address;
      const devType = body?.devType;
      const description = body?.description;
      if (!address || !devType || !description) {
        return Response.json({ error: "Missing address, devType or description" }, { status: 400 });
      }

      const pd = body?.propertyData || {};
      const pdLines = [];
      if (pd.lot_rp) pdLines.push(`- Lot / RP: ${pd.lot_rp}`);
      if (pd.site_area) pdLines.push(`- Site Area: ${pd.site_area}`);
      if (pd.zoning) pdLines.push(`- Zoning: ${pd.zoning}`);
      if (Array.isArray(pd.overlays) && pd.overlays.length) pdLines.push(`- Property Overlays: ${pd.overlays.join(', ')}`);
      const propertyContext = pdLines.length
        ? `\n\nKnown property context (verify and build on this):\n${pdLines.join('\n')}`
        : '';

      const instruction = `You are a town planning assessor. Apply the town planning assessment rules defined in the "town-planning-assessor.md" knowledge file to assess this proposed development:
Address: ${address}
Development Type: ${devType}
Description: ${description}${propertyContext}

Search local planning schemes, zoning and overlays for this address where useful.
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
        const t = await createRes.text();
        console.error("createConversation failed", createRes.status, t);
        return Response.json({ error: `Superagent API error (${createRes.status})` }, { status: 502 });
      }
      const created = await createRes.json();
      const conversationId = created.id;

      // Fire the message without blocking — Superagent processes asynchronously.
      // We return the conversation id immediately and let the client poll for the result.
      fetch(`${baseUrl}/conversations/${conversationId}/messages`, {
        method: "POST",
        headers,
        body: JSON.stringify({ role: "user", content: instruction }),
      }).catch((e) => console.error("sendMessage failed", e));

      return Response.json({ status: "pending", conversation_id: conversationId }, { status: 200 });
    }

    // ---- POLL: check whether the final JSON reply is ready ----
    if (action === 'poll') {
      const conversationId = body?.conversation_id;
      if (!conversationId) {
        return Response.json({ error: "Missing conversation_id" }, { status: 400 });
      }
      const msgs = await fetch(`${baseUrl}/conversations/${conversationId}/messages`, { headers })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
      if (!msgs) {
        return Response.json({ status: "pending" }, { status: 200 });
      }
      const json = findAssessmentJson(msgs);
      if (json) {
        return Response.json({ status: "ready", output: json }, { status: 200 });
      }
      return Response.json({ status: "pending" }, { status: 200 });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("runPlanningAssessment error:", error);
    return Response.json({ error: "Internal Assessment Engine Exception" }, { status: 500 });
  }
});
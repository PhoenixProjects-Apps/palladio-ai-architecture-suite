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
    const input = body?.input;
    const sessionId = body?.sessionId || "";
    if (!input) {
      return Response.json({ error: "Missing input" }, { status: 400 });
    }

    const apiKey = Deno.env.get("SUPERAGENT_API_KEY");
    const agentId = Deno.env.get("SUPERAGENT_AGENT_ID");
    if (!apiKey || !agentId) {
      console.error("Superagent secrets missing");
      return Response.json({ error: "Superagent not configured" }, { status: 500 });
    }

    const payload = { input, stream: false };
    if (sessionId) payload.session_id = sessionId;

    const apiRes = await fetch(`https://api.superagent.ai/v1/agents/${agentId}/invoke`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      console.error("Superagent API error:", apiRes.status, errText);
      return Response.json({ error: `Superagent API error (${apiRes.status})` }, { status: 502 });
    }

    const data = await apiRes.json();
    const output = data.output ?? data.message ?? data.response ??
      (typeof data === "string" ? data : JSON.stringify(data));
    const newSessionId = data.session_id ?? sessionId;

    return Response.json({ output, session_id: newSessionId }, { status: 200 });
  } catch (error) {
    console.error("superagentInvoke error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
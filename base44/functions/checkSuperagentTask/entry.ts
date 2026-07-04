import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    let { session_id, prev_count } = body || {};

    if (!session_id) return Response.json({ error: "Missing session_id" }, { status: 400 });
    session_id = session_id.replace(/[^a-zA-Z0-9\-_]/g, "");

    const owned = await base44.entities.SuperagentSession.filter({ session_id, owner_email: user.email });
    if (!owned || owned.length === 0) return Response.json({ error: "Not found" }, { status: 404 });

    const apiKey = Deno.env.get("SUPERAGENT_API_KEY");
    const agentId = (Deno.env.get("SUPERAGENT_AGENT_ID") || "").replace(/[^a-f0-9]/gi, "");
    if (!apiKey || !agentId) return Response.json({ error: "Superagent not configured" }, { status: 500 });

    const baseUrl = `https://app.base44.com/api/agents/${agentId}`;
    
    // Fixed: Using api_key
    const headers = { "api_key": apiKey, "Content-Type": "application/json" };

    const getMessages = (data) => Array.isArray(data) ? data : (Array.isArray(data?.messages) ? data.messages : (data?.role ? [data] : []));
    const countAssistant = (data) => getMessages(data).filter((m) => m.role === "assistant").length;
    const lastAssistant = (data) => {
      const msgs = getMessages(data);
      const last = msgs[msgs.length - 1];
      if (last?.role === "assistant" && last.content && !(last.tool_calls?.length)) return last.content;
      return null;
    };

    const msgsRes = await fetch(`${baseUrl}/conversations/${session_id}/messages`, { headers });
    if (!msgsRes.ok) return Response.json({ error: `Superagent API error (${msgsRes.status})` }, { status: 502 });
    
    const msgs = await msgsRes.json();

    if (countAssistant(msgs) > (prev_count || 0)) {
      return Response.json({ status: "done", output: lastAssistant(msgs) }, { status: 200 });
    }
    
    return Response.json({ status: "pending" }, { status: 200 });
  } catch (error) {
    console.error("checkSuperagentTask error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
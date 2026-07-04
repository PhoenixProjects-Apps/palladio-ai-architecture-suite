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
    if (!owned || owned.length === 0) return Response.json({ error: "Conversation not found in database" }, { status: 404 });

    // FIXED: Stripping hidden characters from the API key
    const apiKey = (Deno.env.get("SUPERAGENT_API_KEY") || "").trim();
    const agentId = (Deno.env.get("SUPERAGENT_AGENT_ID") || "").replace(/[^a-f0-9]/gi, "");
    
    if (!apiKey || !agentId) return Response.json({ error: "Superagent not configured" }, { status: 500 });

    const baseUrl = `https://app.base44.com/api/agents/${agentId}`;

    // FIXED: Using the exact Authorization header required by FastAPI
    const headers = {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    };

    const getMessages = (data) => Array.isArray(data) ? data : (Array.isArray(data?.messages) ? data.messages : (data?.role ? [data] : []));
    const countAssistant = (data) => getMessages(data).filter((m) => m.role === "assistant").length;
    const lastAssistant = (data) => {
      const msgs = getMessages(data);
      const last = msgs[msgs.length - 1];
      if (last?.role === "assistant" && last.content && !(last.tool_calls?.length)) return last.content;
      return null;
    };

    const msgsRes = await fetch(`${baseUrl}/conversations/${session_id}/messages`, { headers });
    
    // FIXED: Print the ACTUAL error from the AI instead of a generic 502
    if (!msgsRes.ok) {
      const errText = await msgsRes.text().catch(() => "No error text provided");
      return Response.json({ error: `Superagent Polling Error (${msgsRes.status}): ${errText}` }, { status: 502 });
    }

    const msgs = await msgsRes.json();

    if (countAssistant(msgs) > (prev_count || 0)) {
      return Response.json({ status: "done", output: lastAssistant(msgs) }, { status: 200 });
    }

    return Response.json({ status: "pending" }, { status: 200 });
  } catch (error) {
    console.error("checkSuperagentTask error:", error);
    return Response.json({ error: error.message || "Unknown backend crash" }, { status: 500 });
  }
});
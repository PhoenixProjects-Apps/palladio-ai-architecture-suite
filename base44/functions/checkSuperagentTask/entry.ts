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

    const apiKey = (Deno.env.get("SUPERAGENT_API_KEY") || "").trim();
    const agentId = (Deno.env.get("SUPERAGENT_AGENT_ID") || "").trim();
    
    if (!apiKey || !agentId) return Response.json({ error: "Superagent not configured" }, { status: 500 });

    const baseUrl = `https://app.base44.com/api/agents/${agentId}`;

    const headers = {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    };

    const getMessages = (data) => Array.isArray(data) ? data : (Array.isArray(data?.messages) ? data.messages : (data?.role ? [data] : []));
    
    const msgsRes = await fetch(`${baseUrl}/conversations/${session_id}/messages`, { headers });
    
    if (!msgsRes.ok) {
      const errText = await msgsRes.text().catch(() => "No error text provided");
      return Response.json({ error: `Superagent Polling Error (${msgsRes.status}): ${errText}` }, { status: 502 });
    }

    const rawData = await msgsRes.json();
    const msgs = getMessages(rawData);
    
    const assistants = msgs.filter((m) => m.role === "assistant");
    
    if (assistants.length > (prev_count || 0)) {
      // Find valid assistant messages (must be fully generated, not streaming)
      const validAssistants = assistants.filter(m => {
        if (!m.content || typeof m.content !== 'string' || m.content.trim().length === 0) return false;
        if (m.tool_calls?.length) return false;
        if (m.status && !['completed', 'stop'].includes(m.status.toLowerCase())) return false;
        return true;
      });
      
      if (validAssistants.length > 0) {
        // Sort by created_at (ascending) to guarantee we grab the absolute newest message,
        // overcoming descending/ascending differences between Superagent API versions.
        validAssistants.sort((a, b) => {
          if (a.created_at && b.created_at) {
             return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          }
          return 0;
        });
        
        const finalOutput = validAssistants[validAssistants.length - 1].content;
        return Response.json({ status: "done", output: finalOutput }, { status: 200 });
      }
    }

    return Response.json({ status: "pending" }, { status: 200 });
  } catch (error) {
    console.error("checkSuperagentTask error:", error);
    return Response.json({ error: error.message || "Unknown backend crash" }, { status: 500 });
  }
});
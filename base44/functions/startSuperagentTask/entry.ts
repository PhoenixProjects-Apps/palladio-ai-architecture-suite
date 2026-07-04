import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const input = body?.input;
    const fileUrls = Array.isArray(body?.fileUrls) ? body.fileUrls : [];
    if (!input) return Response.json({ error: "Missing input" }, { status: 400 });

    const apiKey = Deno.env.get("SUPERAGENT_API_KEY");
    const agentId = (Deno.env.get("SUPERAGENT_AGENT_ID") || "").trim();
    if (!apiKey || !agentId) return Response.json({ error: "Superagent not configured" }, { status: 500 });

    let baseUrl = Deno.env.get("SUPERAGENT_BASE_URL");
    if (!baseUrl) {
      baseUrl = `https://api.superagent.sh/api/v1/agents/${agentId}`;
    } else if (!baseUrl.includes("agents")) {
      baseUrl = `${baseUrl.replace(/\/$/, '')}/agents/${agentId}`;
    }
    const headers = { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" };

    const getMessages = (data) => Array.isArray(data) ? data : (Array.isArray(data?.messages) ? data.messages : (data?.role ? [data] : []));
    const countAssistant = (data) => getMessages(data).filter((m) => m.role === "assistant").length;
    const lastAssistant = (data) => {
      const msgs = getMessages(data);
      const last = msgs[msgs.length - 1];
      if (last?.role === "assistant" && last.content && !(last.tool_calls?.length)) return last.content;
      return null;
    };

    const createRes = await fetch(`${baseUrl}/conversations`, { method: "POST", headers, body: "{}" });
    if (!createRes.ok) {
      const errText = await createRes.text();
      return Response.json({ error: `Superagent API error (${createRes.status}) - ${errText}`, url: baseUrl }, { status: 502 });
    }
    const created = await createRes.json();
    const conversationId = created.id;
    await base44.entities.SuperagentSession.create({
      session_id: conversationId,
      owner_email: user.email
    });
    const prevCount = 0; // brand new conversation - no assistant messages exist yet

    const msgBody = { role: "user", content: input };
    if (fileUrls.length) msgBody.file_urls = fileUrls;

    const sendRes = await fetch(`${baseUrl}/conversations/${conversationId}/messages`, {
      method: "POST", headers, body: JSON.stringify(msgBody),
    });
    if (!sendRes.ok) return Response.json({ error: `Superagent API error (${sendRes.status})` }, { status: 502 });
    const afterSend = await sendRes.json();

    // If the reply already arrived synchronously, hand it straight back - no polling needed
    let immediateOutput = null;
    if (countAssistant(afterSend) > prevCount) {
      immediateOutput = lastAssistant(afterSend);
    }

    return Response.json({
      session_id: conversationId,
      prev_count: prevCount,
      output: immediateOutput,
    }, { status: 200 });
  } catch (error) {
    console.error("startSuperagentTask error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
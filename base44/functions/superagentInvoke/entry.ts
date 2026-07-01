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
    const fileUrls = Array.isArray(body?.fileUrls) ? body.fileUrls : [];
    if (!input) {
      return Response.json({ error: "Missing input" }, { status: 400 });
    }

    const apiKey = Deno.env.get("SUPERAGENT_API_KEY");
    const agentId = (Deno.env.get("SUPERAGENT_AGENT_ID") || "").replace(/[^a-f0-9]/gi, "");
    if (!apiKey || !agentId) {
      console.error("Superagent secrets missing");
      return Response.json({ error: "Superagent not configured" }, { status: 500 });
    }
    const baseUrl = `https://app.base44.com/api/agents/${agentId}`;

    const headers = { "api_key": apiKey, "Content-Type": "application/json" };

    const getMessages = (data) => {
      if (!data) return [];
      if (Array.isArray(data)) return data;
      if (Array.isArray(data.messages)) return data.messages;
      // If the POST returned a single message object, wrap it in an array
      if (data.role) return [data]; 
      return [];
    };

    const countAssistant = (data) => getMessages(data).filter((m) => m.role === "assistant").length;

    const lastAssistant = (data) => {
      const msgs = getMessages(data);
      if (msgs.length === 0) return null;
      
      const lastMsg = msgs[msgs.length - 1];
      
      // Only process the last message if it's from the assistant
      if (lastMsg.role === "assistant" && lastMsg.content) {
        // If it has tool calls, it's an intermediate step. Not done.
        if (lastMsg.tool_calls && lastMsg.tool_calls.length > 0) return null;
        
        // STRICT CHECK: Wait until the platform explicitly marks the message as done.
        // This prevents the script from grabbing partial chunks while I stream the JSON!
        if (lastMsg.status !== "completed") return null;
        
        return lastMsg.content;
      }
      return null;
    };

    let conversationId = sessionId;
    let prevCount = 0;

    if (conversationId) {
      const chats = await base44.entities.SuperagentChat.filter({ session_id: conversationId });
      if (chats.length === 0) {
        return Response.json({ error: "Forbidden or invalid conversation" }, { status: 403 });
      }
      
      const chat = chats[0];
      if (chat.created_by_id !== user.id) {
        return Response.json({ error: "Unauthorized access to this conversation" }, { status: 403 });
      }

      const existing = await fetch(`${baseUrl}/conversations/${conversationId}/messages`, { headers })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
      if (Array.isArray(existing)) {
        prevCount = countAssistant(existing);
      } else {
        conversationId = "";
      }
    }

    if (!conversationId) {
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
      conversationId = created.id;
      prevCount = 0;
    }

    const msgBody = { role: "user", content: input };
    if (fileUrls.length) msgBody.file_urls = fileUrls;

    const sendRes = await fetch(`${baseUrl}/conversations/${conversationId}/messages`, {
      method: "POST",
      headers,
      body: JSON.stringify(msgBody),
    });
    if (!sendRes.ok) {
      const t = await sendRes.text();
      console.error("sendMessage failed", sendRes.status, t);
      return Response.json({ error: `Superagent API error (${sendRes.status})` }, { status: 502 });
    }
    const afterSend = await sendRes.json();

    let reply = null;
    if (countAssistant(afterSend) > prevCount) {
      reply = lastAssistant(afterSend);
    }

    // The assistant reply is generated asynchronously — poll until it appears.
    for (let i = 0; i < 60 && !reply; i++) {
      await new Promise((res) => setTimeout(res, 2000));
      const msgs = await fetch(`${baseUrl}/conversations/${conversationId}/messages`, { headers })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
      if (msgs && countAssistant(msgs) > prevCount) {
        reply = lastAssistant(msgs);
      }
    }

    if (!reply) {
      return Response.json({ error: "Superagent did not return a response in time." }, { status: 504 });
    }

    return Response.json({ output: reply, session_id: conversationId }, { status: 200 });
  } catch (error) {
    console.error("superagentInvoke error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
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
    const projectId = body?.projectId || null;
    const fileUrls = Array.isArray(body?.fileUrls) ? body.fileUrls : [];
    
    if (!input) {
      return Response.json({ error: "Missing input" }, { status: 400 });
    }

    // Direct LLM invocation replacing old polling behavior
    const llmRes = await base44.integrations.Core.InvokeLLM({
      prompt: input,
      file_urls: fileUrls.length > 0 ? fileUrls : undefined,
      model: "automatic"
    });

    let newSessionId = sessionId;
    if (!newSessionId) {
      newSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      // Create new chat record for SavedChats if no sessionId provided
      await base44.entities.SuperagentChat.create({
        title: input.substring(0, 50) + "...",
        session_id: newSessionId,
        project_id: projectId,
        messages: []
      });
    }

    return Response.json({ 
        output: llmRes,
        session_id: newSessionId
    });

  } catch (error) {
    console.error("Superagent Invoke Error:", error);
    return Response.json({ error: error.message || "Failed to process request" }, { status: 500 });
  }
});
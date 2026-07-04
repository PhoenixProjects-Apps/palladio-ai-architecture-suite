import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    
    if (!user) {
      return Response.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action || 'run';
    const fileUrl = body?.fileUrl;
    
    if (action !== 'run') return Response.json({ error: "Invalid action" }, { status: 400 });
    if (!fileUrl) return Response.json({ error: "A valid file URL is required" }, { status: 400 });
    
    // Grab the credentials securely from the environment
    const apiKey = Deno.env.get("SUPERAGENT_API_KEY");
    const agentId = (Deno.env.get("SUPERAGENT_AGENT_ID") || "").replace(/[^a-f0-9]/gi, "");
    
    if (!apiKey || !agentId) {
      return Response.json({ error: "AI configuration missing on server" }, { status: 500 });
    }

    // Build the Prompt Context (Truncated for security)
    const pd = body?.projectDetails || {};
    const sanitize = (str) => (str ? String(str).substring(0, 200) : '');
    const pdLines = [];
    if (pd.projectName) pdLines.push(`- Project Name: ${sanitize(pd.projectName)}`);
    if (pd.siteArea) pdLines.push(`- Site Area: ${sanitize(pd.siteArea)}`);
    const projectContext = pdLines.length ? `\n\nProject context:\n${pdLines.join('\n')}` : '';

    const instruction = `Please perform an assessment on the attached architectural plan.${projectContext}`;
    
    // We must pass exactly what FastAPI is asking for:
    const baseUrl = `https://app.base44.com/api/agents/${agentId}`;
    const headers = { 
      "Authorization": `Bearer ${apiKey}`, // Fixes the Auth Error!
      "Content-Type": "application/json" 
    };

    // Step 1: Create a direct conversation instance
    const createRes = await fetch(`${baseUrl}/conversations`, { method: "POST", headers, body: "{}" });
    if (!createRes.ok) throw new Error(`Superagent API Error: ${createRes.status}`);
    const conversationId = (await createRes.json()).id;

    // Track ownership so checkSuperagentTask can safely authorize polls
    await base44.entities.SuperagentSession.create({
      session_id: conversationId,
      owner_email: user.email
    });

    // Step 2: Send the prompt and the file URL directly to the AI
    const msgBody = { 
      role: "user", 
      content: instruction,
      file_urls: [fileUrl]
    };

    // Fire the request but DO NOT await the JSON response. This allows the backend
    // function to return immediately, preventing the 10-second serverless timeout.
    // Deno Deploy will allow this fetch to finish in the background if it's not awaited.
    fetch(`${baseUrl}/conversations/${conversationId}/messages`, {
      method: "POST", headers, body: JSON.stringify(msgBody),
    }).catch(console.error);

    // Return the conversation ID so the frontend can poll for the result
    return Response.json({ 
      status: "pending", 
      session_id: conversationId 
    }, { status: 200 });

  } catch (error) {
    console.error("runPlanAssessment fatal error:", error);
    return Response.json({ error: "Internal Assessment Engine Exception" }, { status: 500 });
  }
});
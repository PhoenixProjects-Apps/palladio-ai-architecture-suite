import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const AGENT_NAME = 'architecture_assistant';

// Determine whether the agent has finished: the last message is an assistant
// message with non-empty content and no tool calls still pending/running.
function isAgentDone(messages) {
  if (!messages || !messages.length) return false;
  const last = messages[messages.length - 1];
  if (!last || last.role !== 'assistant') return false;
  const content = typeof last.content === 'string' ? last.content.trim() : '';
  if (!content) return false;
  const toolCalls = last.tool_calls || [];
  const pending = toolCalls.some((tc) =>
    ['pending', 'running', 'in_progress'].includes(tc && tc.status)
  );
  return !pending;
}

// Extract a JSON object from the agent's text response (tolerates code fences
// and surrounding prose). Returns null if no valid JSON object is found.
function extractJson(text) {
  if (!text) return null;
  let s = String(text).trim().replace(/```json/gi, '').replace(/```/g, '').trim();
  try { return JSON.parse(s); } catch (_) {}
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    try { return JSON.parse(s.slice(start, end + 1)); } catch (_) {}
  }
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let user;
    try {
      user = await base44.auth.me();
    } catch (authError) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const body = await req.json().catch(() => ({}));
    const fileUrl = body?.fileUrl;
    const tier = body?.tier;

    if (!fileUrl) {
      return new Response(JSON.stringify({ error: "Missing required fileUrl parameter." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const tierLabel = tier === 'construction'
      ? 'Tier 2 (Construction & Compliance Documentation Review)'
      : 'Tier 1 (Concept & Pricing Review)';

    const instruction = `Please perform a ${tierLabel} assessment on the attached architectural plan, strictly following your architectural-plan-assessor skill framework for that tier.

Before analysing, consult your AgentBible for any relevant past compliance insights, recurring issues, or standard interpretations that apply to this plan type and tier, and use them to inform your review.

After completing the assessment, write one concise, generalisable new insight or recurring pattern you learned to the AgentBible (set category to "compliance_insight", "standard_interpretation", "site_pattern", "recurring_issue", or "design_heuristic"). Never store client-specific dimensions or confidential project data in the Bible.

Do NOT call saveToDrive for this assessment — the calling system handles persistence.

Return your final assessment STRICTLY as a JSON object with no markdown formatting, backticks, or prose outside the JSON. Use these exact keys:
{
  "plan_type": "string matching the drawing classification",
  "overall_score": <integer 0-10>,
  "overview": "high-level overview text",
  "spatial_analysis": "spatial utilisation details",
  "design_observations": ["bullet points of observations"],
  "compliance_flags": ["list of explicit construction code issues or safety flags found"],
  "recommendations": ["remediation suggestions"]
}
If the attached file is clearly not a development layout or architectural sheet drawing, set overall_score to 0.`;

    // Route the assessment through the architecture_assistant agent so it can
    // use its NCC/AS context files, skills, memory, and the AgentBible.
    const conversation = await base44.agents.createConversation({
      agent_name: AGENT_NAME,
      metadata: {
        source: 'palladio_assess',
        tier: tier || 'concept',
        user_id: user.id
      }
    });

    await base44.agents.addMessage(conversation, {
      role: 'user',
      content: instruction,
      file_urls: [fileUrl]
    });

    // Poll for the agent's final response (addMessage returns immediately; the
    // agent processes asynchronously, so we poll the stored conversation).
    const pollIntervalMs = 3000;
    const maxWaitMs = 120000;
    const startedAt = Date.now();
    let finalConversation = null;
    let done = false;

    while (Date.now() - startedAt < maxWaitMs && !done) {
      await new Promise((r) => setTimeout(r, pollIntervalMs));
      try {
        const conv = await base44.agents.getConversation(conversation.id);
        finalConversation = conv;
        if (isAgentDone(conv?.messages)) done = true;
      } catch (_) {
        // transient poll errors — keep polling
      }
    }

    const messages = finalConversation?.messages || [];
    const lastAssistant = [...messages].reverse().find(
      (m) => m.role === 'assistant' && typeof m.content === 'string' && m.content.trim()
    );
    const rawContent = lastAssistant?.content || '';

    if (!rawContent) {
      return new Response(JSON.stringify({
        error: "The agent did not produce a response in time. Please try again.",
        conversation_id: conversation.id
      }), {
        status: 504,
        headers: { "Content-Type": "application/json" }
      });
    }

    const parsed = extractJson(rawContent);
    const assessmentReport = parsed || rawContent; // fall back to raw markdown string

    return new Response(JSON.stringify({
      assessmentReport,
      conversation_id: conversation.id
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("CRITICAL BACKEND ERROR DETECTED:", error);
    return new Response(JSON.stringify({ error: "Internal Assessment Engine Exception" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
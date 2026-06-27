import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const AGENT_NAME = 'architecture_assistant';

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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action || 'run';

    // Fast: create an empty agent conversation and return its id so the frontend
    // can subscribe to it BEFORE the assessment is triggered (live thought process).
    if (action === 'create') {
      const tier = body?.tier || 'concept';
      const conversation = await base44.agents.createConversation({
        agent_name: AGENT_NAME,
        metadata: {
          source: 'palladio_assess',
          tier,
          user_id: user.id
        }
      });
      return new Response(JSON.stringify({
        conversation_id: conversation.id
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Trigger: add the assessment message to an existing conversation. The agent
    // processes asynchronously; the frontend watches via its subscription.
    if (action === 'run') {
      const conversation_id = body?.conversation_id;
      const fileUrl = body?.fileUrl;
      const tier = body?.tier;

      if (!conversation_id || !fileUrl) {
        return new Response(JSON.stringify({ error: "Missing conversation_id or fileUrl" }), {
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

      const conversation = await base44.agents.getConversation(conversation_id);
      if (!conversation) {
        return new Response(JSON.stringify({ error: "Conversation not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }

      await base44.agents.addMessage(conversation, {
        role: 'user',
        content: instruction,
        file_urls: [fileUrl]
      });

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
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
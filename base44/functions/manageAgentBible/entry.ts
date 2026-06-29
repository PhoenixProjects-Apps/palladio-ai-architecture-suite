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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    const dbUser = await base44.asServiceRole.entities.User.get(user.id);
    if (!dbUser || dbUser.role !== 'admin') {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    if (action === 'list') {
      const entries = await base44.asServiceRole.entities.AgentBible.list('-created_date', 200);
      return new Response(JSON.stringify({ entries }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (action === 'delete') {
      const id = body?.id;
      if (!id) {
        return new Response(JSON.stringify({ error: "Missing id" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      await base44.asServiceRole.entities.AgentBible.delete(id);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (action === 'update') {
      const id = body?.id;
      if (!id) {
        return new Response(JSON.stringify({ error: "Missing id" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      const updates = {};
      if (body.title != null) updates.title = body.title;
      if (body.content != null) updates.content = body.content;
      if (body.category != null) updates.category = body.category;
      if (body.tags != null) updates.tags = body.tags;
      await base44.asServiceRole.entities.AgentBible.update(id, updates);
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
    console.error("manageAgentBible error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
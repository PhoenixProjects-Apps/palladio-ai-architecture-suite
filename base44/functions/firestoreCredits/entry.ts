import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const DEFAULT_TOKENS = 10;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body = {};
    try { body = await req.json(); } catch (_) {}
    const action = body.action || 'get';
    const email = user.email;
    if (!email) return Response.json({ error: 'No email on account' }, { status: 400 });

    if (action === 'init') {
      const existing = await base44.entities.UserCredits.filter({ user_email: email });
      if (existing.length > 0) {
        return Response.json({ tokens: existing[0].tokens ?? 0 });
      }
      // Seed from any legacy balance on the User record, else default.
      let seed = DEFAULT_TOKENS;
      try {
        const u = await base44.entities.User.get(user.id);
        if (u && u.tokens !== undefined) seed = u.tokens;
      } catch (_) {}
      await base44.entities.UserCredits.create({ user_email: email, tokens: seed });
      return Response.json({ tokens: seed });
    }

    if (action === 'get') {
      const existing = await base44.entities.UserCredits.filter({ user_email: email });
      return Response.json({ tokens: existing.length > 0 ? (existing[0].tokens ?? 0) : 0 });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('firestoreCredits error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let amount = 1;
    try {
      const body = await req.json();
      if (body && typeof body.amount === 'number' && body.amount > 0) {
        amount = body.amount;
      }
    } catch (_) {}

    const email = user.email;
    if (!email) return Response.json({ error: 'No email on account' }, { status: 400 });

    const existing = await base44.entities.UserCredits.filter({ user_email: email });
    const current = existing.length > 0 ? (existing[0].tokens ?? 0) : 0;
    if (current < amount) {
      return Response.json({
        error: `Insufficient tokens. This action requires ${amount} token(s), but you have ${current}.`,
        success: false,
        required: amount,
        available: current
      }, { status: 200 });
    }

    const newBalance = current - amount;
    if (existing.length > 0) {
      await base44.entities.UserCredits.update(existing[0].id, { tokens: newBalance });
    } else {
      await base44.entities.UserCredits.create({ user_email: email, tokens: newBalance });
    }

    return Response.json({ success: true, tokens: newBalance, consumed: amount });
  } catch (error) {
    console.error('consumeToken error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
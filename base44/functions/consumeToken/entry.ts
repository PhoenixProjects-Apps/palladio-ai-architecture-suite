import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let amount = 1;
    try {
      const body = await req.json();
      if (body && typeof body.amount === 'number') {
        if (body.amount <= 0 || body.amount > 1000) {
          return Response.json({ error: 'Invalid amount' }, { status: 400 });
        }
        amount = body.amount;
      }
    } catch (_) {}

    const email = user.email;
    if (!email) return Response.json({ error: 'No email on account' }, { status: 400 });

    // Atomic conditional debit: the tokens >= amount condition is evaluated in
    // the same server-side update that decrements, so two concurrent debits
    // against a balance sufficient for only one cause exactly one debit and
    // one rejection — no lost updates, no overspend, no negative balance.
    const rows = await base44.entities.UserCredits.filter({ user_email: email });
    if (rows.length === 0) {
      return Response.json({
        error: `Insufficient tokens. This action requires ${amount} token(s), but you have 0.`,
        success: false,
        required: amount,
        available: 0
      }, { status: 200 });
    }

    let debited = false;
    let newBalance = null;
    for (const row of rows) {
      const res = await base44.entities.UserCredits.updateMany(
        { id: row.id, tokens: { $gte: amount } },
        { $inc: { tokens: -amount } }
      );
      if ((res?.updated ?? 0) > 0) {
        debited = true;
        const after = await base44.entities.UserCredits.filter({ user_email: email });
        newBalance = after.reduce((sum, r) => sum + (r.tokens ?? 0), 0);
        break;
      }
    }

    if (!debited) {
      const available = rows.reduce((sum, r) => sum + (r.tokens ?? 0), 0);
      return Response.json({
        error: `Insufficient tokens. This action requires ${amount} token(s), but you have ${available}.`,
        success: false,
        required: amount,
        available
      }, { status: 200 });
    }

    return Response.json({ success: true, tokens: newBalance, consumed: amount });
  } catch (error) {
    console.error('consumeToken error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
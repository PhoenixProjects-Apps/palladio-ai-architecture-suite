import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';
import admin from 'npm:firebase-admin@12.7.0';

const COLLECTION = 'user';

let _db = null;
function getDb() {
  if (_db) return _db;
  const serviceAccount = JSON.parse(Deno.env.get("FIREBASE_SERVICE_ACCOUNT"));
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  _db = admin.firestore();
  _db.settings({ preferRest: true });
  return _db;
}

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

    const email = String(user.email || '').toLowerCase();
    if (!email) return Response.json({ error: 'No email on account' }, { status: 400 });

    const db = getDb();
    const ref = db.collection(COLLECTION).doc(email);

    let newBalance;
    try {
      newBalance = await db.runTransaction(async (t) => {
        const snap = await t.get(ref);
        const current = snap.exists ? (snap.data().tokens ?? 0) : 0;
        if (current < amount) {
          const err = new Error('INSUFFICIENT');
          err.code = 'INSUFFICIENT';
          err.available = current;
          err.required = amount;
          throw err;
        }
        const nb = current - amount;
        t.set(ref, { tokens: nb, updated_date: new Date().toISOString() }, { merge: true });
        return nb;
      });
    } catch (err) {
      if (err.code === 'INSUFFICIENT') {
        return Response.json({
          error: `Insufficient tokens. This action requires ${err.required} token(s), but you have ${err.available}.`,
          success: false,
          required: err.required,
          available: err.available
        }, { status: 403 });
      }
      throw err;
    }

    return Response.json({ success: true, tokens: newBalance, consumed: amount });
  } catch (error) {
    console.error('consumeToken error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
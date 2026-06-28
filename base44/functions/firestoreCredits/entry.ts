import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';
import admin from 'npm:firebase-admin@12.7.0';

const COLLECTION = 'user';
const DEFAULT_TOKENS = 10;

let _db = null;
function parseServiceAccount() {
  const raw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set');
  try {
    return JSON.parse(raw);
  } catch (e) {
    // Possibly double-encoded (a JSON string wrapping the real JSON) — try unwrapping once.
    try { return JSON.parse(JSON.parse(raw)); } catch (_) {
      throw new Error(`Could not parse FIREBASE_SERVICE_ACCOUNT: ${e.message} (firstChar=${raw.charCodeAt(0)}, len=${raw.length})`);
    }
  }
}
function getDb() {
  if (_db) return _db;
  const serviceAccount = parseServiceAccount();
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

    let body = {};
    try { body = await req.json(); } catch (_) {}
    const action = body.action || 'get';
    const email = String(user.email || '').toLowerCase();
    if (!email) return Response.json({ error: 'No email on account' }, { status: 400 });

    const db = getDb();
    const ref = db.collection(COLLECTION).doc(email);

    if (action === 'init') {
      const snap = await ref.get();
      let tokens;
      if (snap.exists) {
        tokens = snap.data().tokens ?? 0;
      } else {
        // Seed from any existing Base44 balance so current users don't lose credits, else default.
        let seed = DEFAULT_TOKENS;
        try {
          const u = await base44.entities.User.get(user.id);
          if (u && u.tokens !== undefined) seed = u.tokens;
        } catch (_) {}
        tokens = seed;
        await ref.set({
          email: user.email,
          name: user.full_name || '',
          base44_user_id: user.id,
          tokens,
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString()
        });
      }
      return Response.json({ tokens });
    }

    if (action === 'get') {
      const snap = await ref.get();
      const tokens = snap.exists ? (snap.data().tokens ?? 0) : 0;
      return Response.json({ tokens });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('firestoreCredits error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
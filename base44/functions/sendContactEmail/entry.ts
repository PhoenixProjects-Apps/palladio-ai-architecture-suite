import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Lightweight in-memory rate limiting (per isolate). Limits abuse from a single
// IP between isolate restarts; sufficient to deter spam on a public endpoint.
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_MAX = 5;                     // max submissions per IP per window
const rateLimitMap = new Map(); // ip -> { count, firstSeen }

const MAX_NAME = 120;
const MAX_EMAIL = 200;
const MAX_MESSAGE = 4000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getClientIp(req) {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.firstSeen > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, firstSeen: now });
    return { allowed: true };
  }
  entry.count += 1;
  if (entry.count > RATE_LIMIT_MAX) {
    const retryAfterSec = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - entry.firstSeen)) / 1000);
    return { allowed: false, retryAfterSec };
  }
  return { allowed: true };
}

Deno.serve(async (req) => {
  try {
    // Rate limit before doing any work
    const ip = getClientIp(req);
    const rl = checkRateLimit(ip);
    if (!rl.allowed) {
      return Response.json(
        { error: 'Too many submissions. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec || 600) } }
      );
    }

    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { name, email, message } = body || {};

    if (!name || !email || !message) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (typeof name !== 'string' || typeof email !== 'string' || typeof message !== 'string') {
      return Response.json({ error: 'Invalid input' }, { status: 400 });
    }
    if (name.length > MAX_NAME || email.length > MAX_EMAIL || message.length > MAX_MESSAGE) {
      return Response.json({ error: 'Input too long' }, { status: 400 });
    }
    if (!EMAIL_RE.test(email)) {
      return Response.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const subject = `New contact form message from ${name}`;
    const bodyText = `You have received a new message from the Palladio contact form.\n\nName: ${name}\nEmail: ${email}\n\nMessage:\n${message}`;

    // Always store the submission so it is captured reliably
    await base44.asServiceRole.entities.ContactMessage.create({ name, email, message });

    // Best-effort email delivery (only works if recipient is a registered app user)
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: 'admin@palladio-ai.app',
        subject,
        body: bodyText,
        from_name: 'Palladio Contact Form'
      });
    } catch (emailErr) {
      console.error('SendEmail failed (recipient may not be a registered user):', emailErr.message);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('sendContactEmail error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
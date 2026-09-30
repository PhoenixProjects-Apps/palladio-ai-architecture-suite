// DISABLED debug endpoint (security cleanup 2026-09-30).
// This function previously persisted raw request headers into Project records,
// which could store sensitive headers (e.g. Authorization). It now performs no
// work, stores nothing, and reflects nothing. Kept as a tombstone because
// out-of-repo consumers cannot be ruled out.
export default async function(req) {
  console.warn('dumpHeaders invoked — endpoint is permanently disabled');
  return Response.json({ error: 'This debug endpoint has been disabled.' }, { status: 410 });
}
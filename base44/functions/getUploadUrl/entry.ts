// DEPRECATED upload path (cleanup 2026-09-30): this function issued Firebase
// Storage signed upload URLs, which the app migrated away from (platform
// storage now hosts uploads). Legacy Firebase assets remain readable via
// saveToDrive's legacy bucket support. No in-repo callers remain; kept as a
// tombstone because out-of-repo consumers cannot be ruled out.
export default async function(req) {
  console.warn('getUploadUrl invoked — endpoint is deprecated');
  return Response.json({ error: 'This upload path has been retired. Use the platform storage integrations.' }, { status: 410 });
}
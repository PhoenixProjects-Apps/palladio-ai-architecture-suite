// DEPRECATED upload path (cleanup 2026-09-30): this function accepted base64
// file payloads in the request body and used the retired UploadFile
// integration. Direct uploads via the platform storage integrations
// (UploadPrivateFile / UploadPublicFile, see src/lib/uploadHelper.js) replaced
// it. No in-repo callers remain; kept as a tombstone because out-of-repo
// consumers cannot be ruled out.
export default async function(req) {
  console.warn('uploadPlanFile invoked — endpoint is deprecated');
  return Response.json({ error: 'This upload path has been retired. Use the platform storage integrations.' }, { status: 410 });
}
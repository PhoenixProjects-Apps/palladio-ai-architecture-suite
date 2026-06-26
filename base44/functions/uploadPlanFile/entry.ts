import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { fileName, fileType, fileBase64 } = body || {};
    if (!fileBase64) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    // Decode base64 to binary
    const binary = atob(fileBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: fileType || 'application/octet-stream' });
    const file = new File([blob], fileName || 'upload', { type: fileType || 'application/octet-stream' });

    const res = await base44.asServiceRole.integrations.Core.UploadFile({ file });
    return Response.json({ file_url: res.file_url || res.url });
  } catch (error) {
    console.error('uploadPlanFile error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
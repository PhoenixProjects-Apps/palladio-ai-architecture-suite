import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Exact source allowlist — discovered from existing ProjectAsset records:
//   media.base44.com                current platform public storage
//   base44.app                      platform storage API + signed URLs
//   firebasestorage.googleapis.com  legacy Firebase assets (bucket-scoped)
//   storage.googleapis.com          legacy Firebase assets, alternate endpoint
const ALLOWED_HOSTS = new Set([
  'media.base44.com',
  'base44.app',
  'firebasestorage.googleapis.com',
  'storage.googleapis.com'
]);
const LEGACY_BUCKET = 'palladio-ai.firebasestorage.app';
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 60000;
const MAX_REDIRECTS = 3;

function validateSourceUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch (_) {
    return { error: 'Invalid fileUrl format' };
  }
  if (url.protocol !== 'https:') return { error: 'Unsupported file source: HTTPS is required' };
  if (url.username || url.password) return { error: 'Credentials in file URLs are not allowed' };
  if (!ALLOWED_HOSTS.has(url.hostname)) return { error: 'Unsupported file source' };
  if (url.hostname === 'firebasestorage.googleapis.com' && !url.pathname.includes(`/b/${LEGACY_BUCKET}/`)) {
    return { error: 'Unsupported legacy storage bucket' };
  }
  if (url.hostname === 'storage.googleapis.com' && !url.pathname.startsWith(`/${LEGACY_BUCKET}/`)) {
    return { error: 'Unsupported legacy storage bucket' };
  }
  return { url };
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { fileUrl, fileName } = await req.json().catch(() => ({}));
    if (!fileUrl || !fileName) {
      return Response.json({ error: 'Missing fileUrl or fileName' }, { status: 400 });
    }

    // Authenticate the requester and verify asset/project access FIRST.
    const assets = await base44.entities.ProjectAsset.filter({ file_url: fileUrl });
    if (assets.length === 0) {
      return Response.json({ error: 'File not found or unauthorized' }, { status: 403 });
    }
    const asset = assets[0];
    const projects = await base44.entities.Project.filter({ id: asset.project_id });
    if (projects.length === 0 || projects[0].created_by_id !== user.id) {
      return Response.json({ error: 'Unauthorized: You do not own the associated project.' }, { status: 403 });
    }

    // Resolve a fetchable URL. Private platform file URIs are signed
    // server-side with a fresh short-lived link (never made public); existing
    // https URLs (platform or legacy Firebase) are validated below.
    let sourceUrl = fileUrl;
    if (!/^https?:\/\//i.test(sourceUrl)) {
      let signed = null;
      try {
        signed = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri: sourceUrl, expires_in: 3600 });
      } catch (_) {
        signed = null;
      }
      if (!signed?.signed_url) {
        return Response.json({ error: 'Unsupported file reference' }, { status: 400 });
      }
      sourceUrl = signed.signed_url;
    }

    // SSRF protection: exact-host allowlist, HTTPS only, no URL credentials,
    // redirects followed manually with every hop re-validated.
    let currentUrl = sourceUrl;
    let fetchRes = null;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const check = validateSourceUrl(currentUrl);
      if (check.error) return Response.json({ error: check.error }, { status: 400 });
      fetchRes = await fetch(currentUrl, { method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if ([301, 302, 303, 307, 308].includes(fetchRes.status)) {
        const location = fetchRes.headers.get('location');
        if (!location) return Response.json({ error: 'Source returned an invalid redirect' }, { status: 502 });
        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }
      break;
    }
    if (!fetchRes.ok) {
      return Response.json({ error: `Source fetch failed (${fetchRes.status})` }, { status: 502 });
    }

    const declaredLength = parseInt(fetchRes.headers.get('content-length') || '0', 10);
    if (declaredLength > MAX_FILE_BYTES) {
      return Response.json({ error: 'File is too large to transfer' }, { status: 413 });
    }

    const blob = await fetchRes.blob();
    if (blob.size === 0) return Response.json({ error: 'Source file is empty' }, { status: 502 });
    if (blob.size > MAX_FILE_BYTES) {
      return Response.json({ error: 'File is too large to transfer' }, { status: 413 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');
    if (!accessToken) {
      return Response.json({ error: 'Google Drive not authorized' }, { status: 403 });
    }

    // Stream the fetched bytes into Drive's multipart upload. The display name
    // is preserved from the asset, and the MIME type travels with the blob —
    // never base64-encoded.
    const metadata = { name: fileName };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', blob, fileName);

    const driveRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      body: form
    });

    if (!driveRes.ok) {
      console.error('Drive upload failed:', driveRes.status);
      return Response.json({ error: `Drive upload failed (${driveRes.status})` }, { status: 502 });
    }

    const result = await driveRes.json();
    return Response.json({ success: true, fileId: result.id });

  } catch (error) {
    console.error('saveToDrive error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { floor_id } = await req.json();
    if (!floor_id) return Response.json({ error: 'floor_id is required' }, { status: 400 });

    const apiKey = Deno.env.get('ARCHILOGIC_API_KEY');
    const secretKey = Deno.env.get('ARCHILOGIC_SECRET_KEY');
    if (!apiKey || !secretKey) {
      console.error('Missing Archilogic credentials');
      return Response.json({ error: 'Archilogic credentials not configured' }, { status: 500 });
    }

    // Try API key first, then secret token
    const authHeaders = {
      'Authorization': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    const authHeadersSecret = { ...authHeaders, 'Authorization': `Bearer ${secretKey}` };

    // Verify the floor exists
    let statusRes = await fetch(`https://api.archilogic.com/v2/floor/${floor_id}`, {
      method: 'GET',
      headers: authHeaders,
    });
    if (!statusRes.ok) {
      statusRes = await fetch(`https://api.archilogic.com/v2/floor/${floor_id}`, {
        method: 'GET',
        headers: authHeadersSecret,
      });
    }

    if (!statusRes.ok) {
      const errText = await statusRes.text();
      console.error('Archilogic floor lookup failed:', statusRes.status, errText);
      return Response.json({ error: `Floor lookup failed: ${errText}` }, { status: statusRes.status });
    }

    // Try to export the floor as GLTF — if the floor is still processing, this may fail
    let gltfRes = await fetch(`https://api.archilogic.com/v2/floor/${floor_id}/gltf`, {
      method: 'POST',
      headers: authHeaders,
    });
    if (!gltfRes.ok) {
      gltfRes = await fetch(`https://api.archilogic.com/v2/floor/${floor_id}/gltf`, {
        method: 'POST',
        headers: authHeadersSecret,
      });
    }

    if (!gltfRes.ok) {
      const errText = await gltfRes.text();
      console.log('GLTF export not ready yet:', gltfRes.status, errText);
      return Response.json({ status: 'processing' });
    }

    const gltfData = await gltfRes.json();
    const modelUrl = gltfData.downloadUrl;
    console.log('Archilogic GLTF download URL:', modelUrl);

    if (!modelUrl) {
      return Response.json({ status: 'processing' });
    }

    // Save the URL to the user's database record
    try {
      await base44.asServiceRole.entities.User.update(user.id, { model3d_url: modelUrl });
    } catch (e) {
      console.error('Failed to save model URL to user record:', e);
    }

    return Response.json({ status: 'completed', modelUrl });
  } catch (error) {
    console.error('archilogicCheckStatus error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
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

    const authHeaders = {
      'Authorization': `Bearer ${secretKey}`,
      'X-API-Key': apiKey,
      'Accept': 'application/json',
    };

    // Check conversion / floor status
    const statusRes = await fetch(`https://api.archilogic.com/v2/floor/${floor_id}`, {
      method: 'GET',
      headers: authHeaders,
    });

    if (!statusRes.ok) {
      const errText = await statusRes.text();
      console.error('Archilogic status check failed:', statusRes.status, errText);
      return Response.json({ error: `Status check failed: ${errText}` }, { status: statusRes.status });
    }

    const floorData = await statusRes.json();
    const feature = floorData.features?.[0] || floorData;
    const status = feature.properties?.conversionStatus || feature.conversionStatus || feature.status || 'processing';
    console.log('Archilogic floor status for', floor_id, ':', status);

    if (status === 'completed' || status === 'COMPLETED' || status === 'ready' || status === 'Ready') {
      // Export floor as GLTF to get the 3D model download URL
      const gltfRes = await fetch(`https://api.archilogic.com/v2/floor/${floor_id}/gltf`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
      });

      if (!gltfRes.ok) {
        const errText = await gltfRes.text();
        console.error('Archilogic GLTF export failed:', gltfRes.status, errText);
        return Response.json({ status: 'completed', error: `GLTF export failed: ${errText}` });
      }

      const gltfData = await gltfRes.json();
      const modelUrl = gltfData.downloadUrl;
      console.log('Archilogic GLTF download URL:', modelUrl);

      // Save the URL to the user's database record
      if (modelUrl) {
        try {
          await base44.auth.updateMe({ model3d_url: modelUrl });
        } catch (e) {
          console.error('Failed to save model URL to user record:', e);
        }
      }

      return Response.json({ status: 'completed', modelUrl });
    }

    return Response.json({ status });
  } catch (error) {
    console.error('archilogicCheckStatus error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
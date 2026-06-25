import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_url } = await req.json();
    if (!file_url) return Response.json({ error: 'file_url is required' }, { status: 400 });

    const apiKey = Deno.env.get('ARCHILOGIC_API_KEY');
    const secretKey = Deno.env.get('ARCHILOGIC_SECRET_KEY');
    if (!apiKey || !secretKey) {
      console.error('Missing Archilogic credentials');
      return Response.json({ error: 'Archilogic credentials not configured' }, { status: 500 });
    }

    // Fetch the uploaded image
    const imageRes = await fetch(file_url);
    if (!imageRes.ok) {
      console.error('Failed to fetch uploaded image:', imageRes.status);
      return Response.json({ error: 'Failed to fetch uploaded image' }, { status: 500 });
    }
    const imageBlob = await imageRes.blob();

    // Initiate floor plan conversion via Archilogic API
    const formData = new FormData();
    formData.append('file', imageBlob, 'floorplan.png');
    formData.append('name', `Palladio conversion - ${user.email || 'user'}`);

    const convertRes = await fetch('https://api.archilogic.com/v2/floor/conversion', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'X-API-Key': apiKey,
      },
      body: formData,
    });

    if (!convertRes.ok) {
      const errText = await convertRes.text();
      console.error('Archilogic conversion initiation failed:', convertRes.status, errText);
      return Response.json({ error: `Archilogic conversion failed: ${errText}` }, { status: convertRes.status });
    }

    const convertData = await convertRes.json();
    const floorId = convertData.floorId || convertData.id || convertData.floor_id;
    console.log('Archilogic conversion initiated:', JSON.stringify(convertData));
    return Response.json({ floorId, status: 'processing' });
  } catch (error) {
    console.error('archilogicConvert error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
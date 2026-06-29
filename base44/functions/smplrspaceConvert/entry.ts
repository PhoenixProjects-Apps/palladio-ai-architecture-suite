import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const apiKey = Deno.env.get("SMPLRSPACE_API_KEY");
    if (!apiKey) {
      return Response.json({ error: 'SMPLRSPACE_API_KEY not configured' }, { status: 500 });
    }

    const { file_url, space_name } = await req.json();
    if (!file_url) {
      return Response.json({ error: 'file_url is required' }, { status: 400 });
    }

    try {
      const urlObj = new URL(file_url);
      if (!['firebasestorage.googleapis.com', 'storage.googleapis.com'].includes(urlObj.hostname)) {
        return Response.json({ error: 'Invalid file_url domain' }, { status: 400 });
      }
    } catch {
      return Response.json({ error: 'Invalid file_url format' }, { status: 400 });
    }

    try {
      const consumeRes = await base44.functions.invoke('consumeToken', { amount: 1 });
      if (!consumeRes.data || !consumeRes.data.success) {
        return Response.json({ error: "Insufficient tokens" }, { status: 403 });
      }
    } catch (err) {
      return Response.json({ error: err.response?.data?.error || "Insufficient tokens" }, { status: 403 });
    }

    // SMPLRSPACE uses QueryClient to create spaces
    // First, we need to upload the floor plan to their system
    // The createSpace endpoint creates a space, then we need to upload the image
    
    const response = await fetch('https://api.smplrspace.com/v1/spaces', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: space_name || 'Floor Plan',
        source_url: file_url,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SMPLRSPACE API error:', errorText);
      return Response.json({ error: 'Failed to create space', details: errorText }, { status: response.status });
    }

    const data = await response.json();
    return Response.json({ 
      spaceId: data.sid || data.space_id,
      status: 'processing'
    });

  } catch (error) {
    console.error('Error in smplrspaceConvert:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
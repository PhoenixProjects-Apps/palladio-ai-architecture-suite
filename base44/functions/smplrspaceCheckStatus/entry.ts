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

    const { space_id } = await req.json();
    if (!space_id) {
      return Response.json({ error: 'space_id is required' }, { status: 400 });
    }

    // Check space status via SMPLRSPACE API
    const response = await fetch(`https://api.smplrspace.com/v1/spaces/${space_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SMPLRSPACE API error:', errorText);
      return Response.json({ error: 'Failed to get space status', details: errorText }, { status: response.status });
    }

    const data = await response.json();
    
    // Check if space is ready (has embed shortcode or published status)
    const isReady = data.status === 'published' || data.short_code;
    
    return Response.json({
      status: isReady ? 'completed' : 'processing',
      spaceId: data.sid || space_id,
      shortCode: data.short_code,
      embedUrl: data.short_code ? `https://smplr.me/${data.short_code}` : null,
    });

  } catch (error) {
    console.error('Error in smplrspaceCheckStatus:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
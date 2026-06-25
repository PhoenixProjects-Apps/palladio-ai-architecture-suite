import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const apiKey = Deno.env.get("HI3D_API_KEY");
    if (!apiKey) {
      return Response.json({ error: 'HI3D_API_KEY not configured' }, { status: 500 });
    }

    const body = await req.json();
    const task_id = body.task_id;
    if (!task_id) {
      return Response.json({ error: 'task_id is required' }, { status: 400 });
    }

    const response = await fetch(`https://api.hitem3d.ai/open-api/v1/query-task?task_id=${task_id}`, {
      method: 'GET',
      headers: {
        'api_key': apiKey,
      }
    });

    const responseText = await response.text();
    console.log('Hi3D check status response:', response.status, responseText);

    if (!response.ok) {
      let errorMessage = 'Failed to get task status';
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.msg || errorData.error || errorMessage;
      } catch {
        errorMessage = responseText || `HTTP ${response.status}`;
      }
      return Response.json({ error: errorMessage, status: response.status }, { status: response.status });
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse Hi3D response:', e);
      return Response.json({ error: 'Invalid response from Hi3D API' }, { status: 500 });
    }

    if (data.code !== 200) {
      return Response.json({ error: data.msg || 'Hi3D API error', code: data.code }, { status: 500 });
    }

    const state = data.data?.state;
    const modelUrl = data.data?.url;

    if (state === 'success') {
      return Response.json({
        status: 'completed',
        modelUrl: modelUrl,
        coverUrl: data.data?.cover_url,
      });
    } else if (state === 'failed') {
      return Response.json({
        status: 'failed',
        error: 'Task generation failed',
      });
    } else {
      // created, queueing, processing
      return Response.json({
        status: 'processing',
        state: state,
      });
    }

  } catch (error) {
    console.error('Error in hi3dCheckStatus:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
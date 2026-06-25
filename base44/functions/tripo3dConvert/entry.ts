import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_url } = await req.json();
    if (!file_url) return Response.json({ error: 'file_url is required' }, { status: 400 });

    const apiKey = Deno.env.get('TRIPO_SECRET_KEY');
    if (!apiKey) {
      console.error('Missing TRIPO_SECRET_KEY');
      return Response.json({ error: 'Tripo3D API key not configured' }, { status: 500 });
    }

    // Determine image type from URL extension
    const ext = file_url.split('?')[0].split('.').pop().toLowerCase();
    const imageType = ['jpg', 'png', 'webp'].includes(ext) ? ext : 'jpg';

    // Create image_to_model task via Tripo3D API
    console.log('Creating Tripo3D image_to_model task for:', file_url);
    const taskRes = await fetch('https://api.tripo3d.ai/v2/openapi/task', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'image_to_model',
        file: {
          type: imageType,
          url: file_url,
        },
      }),
    });

    const taskData = await taskRes.json();

    if (taskData.code !== 0) {
      console.error('Tripo3D task creation failed:', taskData);
      return Response.json({ error: taskData.msg || 'Failed to create 3D model task' }, { status: 500 });
    }

    const taskId = taskData.data?.task_id;
    if (!taskId) {
      return Response.json({ error: 'No task ID returned from Tripo3D' }, { status: 500 });
    }

    console.log('Tripo3D task created:', taskId);
    return Response.json({ taskId, status: 'processing' });
  } catch (error) {
    console.error('tripo3dConvert error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
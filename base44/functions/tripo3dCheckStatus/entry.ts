import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { task_id } = await req.json();
    if (!task_id) return Response.json({ error: 'task_id is required' }, { status: 400 });

    const apiKey = Deno.env.get('TRIPO_SECRET_KEY');
    if (!apiKey) {
      console.error('Missing TRIPO_SECRET_KEY');
      return Response.json({ error: 'Tripo3D API key not configured' }, { status: 500 });
    }

    // Poll task status via Tripo3D API
    const statusRes = await fetch(`https://api.tripo3d.ai/v2/openapi/task/${task_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    const statusData = await statusRes.json();

    if (statusData.code !== 0) {
      console.error('Tripo3D status check failed:', statusData);
      return Response.json({ error: statusData.msg || 'Failed to check task status' }, { status: 500 });
    }

    const taskStatus = statusData.data?.status;
    console.log('Tripo3D task', task_id, 'status:', taskStatus);

    if (taskStatus === 'success') {
      const modelUrl = statusData.data?.output?.model;
      if (modelUrl) {
        // Save the URL to the user's database record
        try {
          await base44.asServiceRole.entities.User.update(user.id, { model3d_url: modelUrl });
        } catch (e) {
          console.error('Failed to save model URL to user record:', e);
        }
        return Response.json({ status: 'completed', modelUrl });
      }
      return Response.json({ status: 'processing' });
    } else if (taskStatus === 'failed' || taskStatus === 'cancelled') {
      return Response.json({ error: '3D model generation failed or was cancelled', status: 'failed' }, { status: 500 });
    } else {
      return Response.json({ status: 'processing' });
    }
  } catch (error) {
    console.error('tripo3dCheckStatus error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
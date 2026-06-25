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
      console.error('Tripo3D status check failed:', JSON.stringify(statusData));
      return Response.json({ status: 'failed', error: statusData.msg || 'Failed to check task status' });
    }

    const taskStatus = statusData.data?.status;
    console.log('Tripo3D task', task_id, 'status:', taskStatus);
    console.log('Tripo3D full data:', JSON.stringify(statusData.data));

    // Check for success (handle both lowercase and uppercase)
    if (taskStatus === 'success' || taskStatus === 'SUCCEEDED' || taskStatus === 'SUCCESS') {
      // Try multiple possible paths for the model URL
      const output = statusData.data?.output || {};
      const modelUrl = output.model || output.pbr_model || output.base_model || output.rendered_image;
      console.log('Tripo3D output keys:', Object.keys(output));
      console.log('Tripo3D model URL:', modelUrl);

      if (modelUrl) {
        // Save the URL to the user's database record
        try {
          await base44.asServiceRole.entities.User.update(user.id, { model3d_url: modelUrl });
        } catch (e) {
          console.error('Failed to save model URL to user record:', e);
        }
        return Response.json({ status: 'completed', modelUrl });
      }
      // Model URL not found in expected paths - log and return as failed
      console.error('Tripo3D task succeeded but no model URL found in output:', JSON.stringify(output));
      return Response.json({ status: 'failed', error: '3D model generated but download URL not found' });
    }

    // Check for failure (handle both lowercase and uppercase)
    if (taskStatus === 'failed' || taskStatus === 'cancelled' || taskStatus === 'FAILED' || taskStatus === 'CANCELLED') {
      console.error('Tripo3D task failed:', taskStatus);
      return Response.json({ status: 'failed', error: '3D model generation failed or was cancelled' });
    }

    // Still processing
    return Response.json({ status: 'processing', taskStatus });
  } catch (error) {
    console.error('tripo3dCheckStatus error:', error);
    return Response.json({ status: 'failed', error: error.message });
  }
});
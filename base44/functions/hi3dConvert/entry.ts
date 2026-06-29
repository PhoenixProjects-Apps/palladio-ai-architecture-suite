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

    const { file_url } = await req.json();
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

    console.log('Creating Hi3D task with file_url:', file_url);

    // Download the image from the file_url and convert to blob
    const imageResponse = await fetch(file_url);
    if (!imageResponse.ok) {
      return Response.json({ error: 'Failed to download image from file_url' }, { status: 500 });
    }
    
    const imageBlob = await imageResponse.blob();
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    const fileName = file_url.split('/').pop() || 'image.jpg';

    // Create form data for multipart upload
    const formData = new FormData();
    formData.append('request_type', '3'); // both: geometry+texture
    formData.append('model', 'hitem3dv2.1');
    formData.append('resolution', '1536fast');
    formData.append('format', '2'); // glb
    formData.append('pbr', '1');
    formData.append('images', imageBlob, fileName);

    const response = await fetch('https://api.hitem3d.ai/open-api/v1/submit-task', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });

    const responseText = await response.text();
    console.log('Hi3D response status:', response.status);
    console.log('Hi3D response body:', responseText);

    if (!response.ok) {
      let errorMessage = 'Failed to create task';
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

    const taskId = data.data?.task_id;
    if (!taskId) {
      console.error('No task_id in response:', data);
      return Response.json({ error: 'No task ID returned from API', response: data }, { status: 500 });
    }

    return Response.json({ 
      taskId: taskId,
      status: 'processing'
    });

  } catch (error) {
    console.error('Error in hi3dConvert:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
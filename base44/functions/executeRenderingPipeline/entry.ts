import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function verifyStructure(layoutData) {
  // Pass 1 logic: check if the structural data is geometrically sound.
  // We'll perform a basic validation check ensuring it's a valid non-empty object.
  if (!layoutData || typeof layoutData !== 'object' || Object.keys(layoutData).length === 0) {
    return false;
  }
  return true;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Attempt authentication (if this is triggered by a user action)
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { generation_id } = await req.json();
    if (!generation_id) {
      return Response.json({ error: 'Missing generation_id parameter' }, { status: 400 });
    }

    const record = await base44.entities.FloorplanGenerations.get(generation_id);
    if (!record) {
      return Response.json({ error: 'FloorplanGenerations record not found' }, { status: 404 });
    }

    // ========================================================
    // PASS 1: Structural Verification
    // ========================================================
    const isStructurallySound = verifyStructure(record.raw_layout_data);
    
    if (!isStructurallySound) {
      await base44.entities.FloorplanGenerations.update(generation_id, { status: 'Failed' });
      return Response.json({ error: 'Structural Verification Failed: Invalid raw_layout_data' }, { status: 400 });
    }
    
    await base44.entities.FloorplanGenerations.update(generation_id, { status: 'Structure_Passed' });


    // ========================================================
    // PASS 2: Aesthetic Render
    // ========================================================
    const prompt = record.injected_api_prompt || "High-end marketing layout architectural plan.";
    let existingImageUrls = undefined;
    
    // Check if there is an image to base this off. 
    // The structured data might just be used if we don't have an image, but typically sourceImage is passed.
    // However, the function gets 'raw_layout_data'.
    if (record.raw_layout_data && record.raw_layout_data.imageUrl) {
        existingImageUrls = [record.raw_layout_data.imageUrl];
    }
    
    try {
        const response = await base44.asServiceRole.integrations.Core.GenerateImage({
            prompt: prompt,
            ...(existingImageUrls ? { existing_image_urls: existingImageUrls } : {})
        });

        await base44.entities.FloorplanGenerations.update(generation_id, {
            status: 'Completed',
            output_image_url: response.url
        });

        return Response.json({ 
            success: true, 
            status: 'Completed', 
            output_image_url: response.url 
        });
    } catch (err) {
        await base44.entities.FloorplanGenerations.update(generation_id, { status: 'Failed' });
        return Response.json({ error: 'Pass 2 Aesthetic Render Failed', details: err.message }, { status: 400 });
    }

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
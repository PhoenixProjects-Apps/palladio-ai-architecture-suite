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
    const RENDER_ENGINE_URL = Deno.env.get("RENDER_ENGINE_URL") || "https://api.example-rendering.com/v1/render";
    const RENDER_ENGINE_API_KEY = Deno.env.get("RENDER_ENGINE_API_KEY") || "";

    const payload = {
      "generation_id": record.id,
      "pipeline_stage": "pass_2_aesthetic",
      "rendering_parameters": {
        "prompt": record.injected_api_prompt || "High-end marketing layout architectural plan.",
        "negative_prompt": "blurry, low resolution, warped furniture, floating walls, overlapping doors, distorted perspective, extra rooms, monochrome if photorealistic selected, handwritten notes, text overlays",
        "aspect_ratio": "4:3",
        "resolution_width": 2048,
        "resolution_height": 1536
      }
    };

    const maxRetries = 3;
    let finalError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(RENDER_ENGINE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RENDER_ENGINE_API_KEY}`
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const data = await response.json();
          // Assuming the external API returns the final asset link via 'image_url'
          const outputImageUrl = data.image_url || data.url || data.output_image_url;

          await base44.entities.FloorplanGenerations.update(generation_id, {
            status: 'Completed',
            output_image_url: outputImageUrl
          });

          return Response.json({ 
            success: true, 
            status: 'Completed', 
            output_image_url: outputImageUrl 
          });
        }

        // Check for transient errors (e.g., 429 Too Many Requests, 504 Gateway Timeout)
        if (response.status === 429 || response.status === 504) {
          await base44.entities.FloorplanGenerations.update(generation_id, { status: 'Error_Retrying' });
          if (attempt < maxRetries) {
            await delay(10000); // Wait 10 seconds before next attempt
            continue;
          }
        }

        // Fatal errors (e.g., 400 Bad Request) or exhausted retries
        finalError = `Render Engine API failed with status: ${response.status}`;
        break;

      } catch (err) {
        if (attempt === maxRetries) {
          finalError = err.message;
          break;
        }
        await base44.entities.FloorplanGenerations.update(generation_id, { status: 'Error_Retrying' });
        await delay(10000); // 10 seconds spacing
      }
    }

    // If we escape the loop without a successful return, it's a failure
    await base44.entities.FloorplanGenerations.update(generation_id, { status: 'Failed' });
    return Response.json({ error: 'Pass 2 Aesthetic Render Failed', details: finalError }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
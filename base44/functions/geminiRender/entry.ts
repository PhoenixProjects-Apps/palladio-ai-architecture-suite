import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

export default Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json();
    const { input_assets, ui_selections, aspect_ratio, seed, prompt_additions } = payload;

    try {
      const consumeRes = await base44.functions.invoke('consumeToken', { amount: 5 });
      if (!consumeRes.data || !consumeRes.data.success) {
        return Response.json({ error: "Insufficient tokens" }, { status: 403 });
      }
    } catch (err) {
      return Response.json({ error: err.response?.data?.error || "Insufficient tokens" }, { status: 403 });
    }

    const existing_image_urls = [];
    if (input_assets?.base_structure_image) existing_image_urls.push(input_assets.base_structure_image);
    if (input_assets?.style_reference_image) existing_image_urls.push(input_assets.style_reference_image);

    const textPrompt = `
You are an expert architectural visualizer.
Follow the exact layout, spatial boundaries, and architectural lines of the base structure image without altering the camera angle.
Extract material finishes and colour tones from the style reference image and map them onto the layout.

UI SELECTIONS:
- Room Type / Architectural Style: ${ui_selections?.architecturalStyle || 'None specified'}
- Lighting Preset: ${ui_selections?.lighting || 'None specified'}
- Environment & Setting: ${ui_selections?.environment || 'None specified'}
- Camera & Framing: ${ui_selections?.camera || 'None specified'}
- Primary Materials: ${(ui_selections?.materialPalette || []).join(', ')}

ASPECT RATIO: ${aspect_ratio || '16:9'}
${seed ? `SEED: ${seed}` : ''}
${prompt_additions ? `ADDITIONAL INSTRUCTIONS: ${prompt_additions}` : ''}

HIDDEN MODIFIERS:
Photorealistic architectural visualization, architectural digest photography, 8k resolution, ray-traced reflections, sharp details, highly detailed textures, global illumination.

DO NOT INCLUDE:
3D render look, cartoon, painting, low quality, blueprint, sketch, generic furniture, distorted perspective.
    `.trim();

    const response = await base44.asServiceRole.integrations.Core.GenerateImage({
      prompt: textPrompt,
      existing_image_urls: existing_image_urls.length > 0 ? existing_image_urls : undefined
    });

    return Response.json({
      success: true,
      url: response.url
    });

  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function compileMasterPrompt(generationRecord) {
  const baselinePrompt = "High-end marketing layout architectural plan. Enhance the 'Photorealistic' texture parameters. Ensure the engine explicitly separates material assignments for a clean real estate look: Flooring: Light oak hardwood planks with subtle matte reflection. Kitchen/Bath Surfaces: Polished white quartz or Carrara marble. Walls: Clean matte white architectural paint. Fixtures: Modern brushed steel and transparent clear glass. Avoid: Plastic-looking surfaces, dark heavy mud textures, over-saturated colors, and deep unrealistic shadows.";
  
  const perspectiveMap = {
    "Isometric": "3D axonometric view, 45-degree angle dollhouse view, detailed wall height, architectural visualization, global studio lighting",
    "Top-Down": "Orthographic top-down projection, flat overhead 3D view, direct bird's eye blueprint, true geometry, zero camera distortion",
    "Cut-Away": "Sectional cut-away view, roof removed, sliced multi-level floor plan, exposed interior mezzanine, volumetric depth"
  };

  const finishMap = {
    "Photorealistic": "photorealistic architectural render, high-end CGI, ray-traced global illumination, realistic physical material textures (light natural oak wood flooring planks, polished white carrara marble countertops, soft linen fabric seating upholstery), clear double-glazed window glass panes, brushed steel metal fixtures, soft studio interior lighting, hyper-realistic reflections, sharp ambient occlusion shadows, ultra-detailed 8k resolution surfaces",
    "Clay Model": "ambient occlusion render, monochromatic white clay model, untextured architectural massing, focus on spatial volume, smooth matte surfaces"
  };

  const layoutMap = {
    "Standard 3D": "full three-dimensional space, volumetric rooms, high fidelity",
    "Hybrid 2D/3D": "flat 2D color layout plan with 3D drop shadows, textured flooring overlays, clean vector aesthetic, high contrast layout"
  };

  const styleChoice = generationRecord.ui_style_selection;
  const finishChoice = generationRecord.ui_finish_selection;
  const layoutChoice = generationRecord.ui_layout_selection;

  const perspectivePhrase = perspectiveMap[styleChoice] || perspectiveMap["Isometric"];
  const finishPhrase = finishMap[finishChoice] || finishMap["Photorealistic"];
  const layoutPhrase = layoutMap[layoutChoice] || layoutMap["Standard 3D"];

  return `${baselinePrompt} ${perspectivePhrase}, ${finishPhrase}, ${layoutPhrase}.`.replace(/\s+/g, ' ').trim();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
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

    const compiledPrompt = compileMasterPrompt(record);

    const updatedRecord = await base44.entities.FloorplanGenerations.update(generation_id, {
      injected_api_prompt: compiledPrompt
    });

    return Response.json({ 
      success: true, 
      injected_api_prompt: compiledPrompt,
      record: updatedRecord
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
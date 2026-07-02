import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { GoogleGenAI } from 'npm:@google/genai';

export default Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json();
    const { input_assets, ui_selections, aspect_ratio, seed } = payload;

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return Response.json({ error: 'GEMINI_API_KEY is not configured.' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    const contents = [];

    // Helper to fetch and convert image to base64
    const fetchImageAsInlineData = async (url) => {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < uint8Array.byteLength; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      return {
        inlineData: {
          data: btoa(binary),
          mimeType: response.headers.get('content-type') || 'image/jpeg'
        }
      };
    };

    // 1. Base Structure Asset
    if (input_assets?.base_structure_image) {
      contents.push(await fetchImageAsInlineData(input_assets.base_structure_image));
    }

    // 2. Style Reference Asset
    if (input_assets?.style_reference_image) {
      contents.push(await fetchImageAsInlineData(input_assets.style_reference_image));
    }

    // 3. Text Prompt
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

HIDDEN MODIFIERS:
Photorealistic architectural visualization, architectural digest photography, 8k resolution, ray-traced reflections, sharp details, highly detailed textures, global illumination.
    `;
    contents.push(textPrompt);

    // Negative prompting can be handled in generationConfig if supported, 
    // or appended to the prompt for models that don't natively support negative prompts.
    const negativePrompt = "3D render look, cartoon, painting, low quality, blueprint, sketch, generic furniture, distorted perspective.";

    const config: any = {
      temperature: 0.3,
      systemInstruction: `Do not include these elements: ${negativePrompt}`
    };

    // Note: Gemini 2.5 flash is primarily a multimodal text/json model.
    // If the intent is image generation, the SDK's generateImages method with imagen-3.0-generate-001 is typically used.
    // However, adhering strictly to the requirement of targeting gemini-2.5-flash with generateContent:
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: config
    });

    return Response.json({
      success: true,
      text: response.text,
      aspect_ratio,
      seed
    });

  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
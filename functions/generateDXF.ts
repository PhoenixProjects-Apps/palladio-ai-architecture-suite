import { createClientFromRequest } from 'npm:@base44/sdk@0.8.18';
import makerjs from 'npm:makerjs@0.17.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (req.method !== 'POST') {
            return Response.json({ error: 'Method not allowed' }, { status: 405 });
        }

        const { analysis } = await req.json();

        if (!analysis) {
            return Response.json({ error: 'Missing analysis text' }, { status: 400 });
        }

        // Call LLM to parse the analysis text into structured room coordinates
        const prompt = `Based on the following architectural floorplan analysis, extract the approximate layout.
Return a valid JSON array of rooms. Each room must have:
- name: string
- x: number (top-left X coordinate in mm, start at 0)
- y: number (top-left Y coordinate in mm, start at 0)
- w: number (width in mm)
- h: number (height in mm)
Make sure the rooms form a logical layout without overlapping. Assume standard wall thickness is 150mm (but just give inner dimensions).
Analysis text:
${analysis}`;

        const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    rooms: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                name: { type: "string" },
                                x: { type: "number" },
                                y: { type: "number" },
                                w: { type: "number" },
                                h: { type: "number" }
                            },
                            required: ["name", "x", "y", "w", "h"]
                        }
                    }
                },
                required: ["rooms"]
            }
        });

        const rooms = llmResponse.rooms || [];

        // Build DXF using makerjs
        const model = {
            models: {}
        };

        rooms.forEach((r, i) => {
            const x = r.x;
            const y = -r.y;
            const w = r.w;
            const h = r.h;
            
            // Create a rectangle for the room
            const roomModel = new makerjs.models.Rectangle(w, h);
            
            // Assign the room to a specific layer
            roomModel.layer = 'WALLS';
            
            // Move it to the correct coordinates
            // Note: makerjs rectangle's origin is bottom-left, our y is the top, 
            // so bottom-left is (x, y - h)
            roomModel.origin = [x, y - h];
            
            model.models[`room_${i}`] = roomModel;
        });

        // makerjs generates a clean R12 DXF file which is highly compatible
        const dxfString = makerjs.exporter.toDXF(model, {
            units: makerjs.unitType.Millimeter
        });

        return new Response(dxfString, {
            headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Disposition': 'attachment; filename="floorplan.dxf"'
            }
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
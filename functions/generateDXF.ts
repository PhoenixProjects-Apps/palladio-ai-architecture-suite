import { createClientFromRequest } from 'npm:@base44/sdk@0.8.18';
import DxfWriter from 'npm:dxf-writer';

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

        const { analysis, imageUrl, overallWidth, overallLength } = await req.json();

        if (!imageUrl && !analysis) {
            return Response.json({ error: 'Missing analysis text or image URL' }, { status: 400 });
        }

        let prompt;
        let file_urls = undefined;
        
        const dimensionContext = (overallWidth || overallLength) 
            ? `\n\nCRITICAL SCALING INFO: The overall bounding box of this floorplan is ${overallWidth || 'unknown'}mm wide by ${overallLength || 'unknown'}mm long. Use these dimensions as a strict boundary. Scale and position all rooms so they fit perfectly within this area.`
            : '';

        if (imageUrl) {
            prompt = `Carefully analyze this floorplan image. Extract the exact layout to create a highly accurate CAD drawing.
Look closely at the dimensions written in the rooms (e.g., "3.1 x 3.0" means 3100mm x 3000mm).${dimensionContext}
Return a valid JSON array of rooms. Each room must have:
- name: string (e.g., "Master Bedroom", "Kitchen", "Living")
- x: number (top-left X coordinate in mm, start at 0, relative to the overall plan. Pay extreme attention to alignment with other rooms)
- y: number (top-left Y coordinate in mm, start at 0, relative to the overall plan)
- w: number (width in mm, read from the text in the image if available)
- h: number (height in mm, read from the text in the image if available)
Make sure the rooms form a logical layout exactly matching the image. Rooms that are adjacent in the image should share the exact same coordinates on their shared edges (no overlapping, no gaps).`;
            file_urls = [imageUrl];
        } else {
            prompt = `Based on the following architectural floorplan analysis, extract the approximate layout.
Return a valid JSON array of rooms. Each room must have:
- name: string
- x: number (top-left X coordinate in mm, start at 0)
- y: number (top-left Y coordinate in mm, start at 0)
- w: number (width in mm)
- h: number (height in mm)
Make sure the rooms form a logical layout without overlapping. Assume standard wall thickness is 150mm (but just give inner dimensions).
Analysis text:
${analysis}`;
        }

        const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt,
            ...(file_urls ? { file_urls } : {}),
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

        // Build DXF using dxf-writer
        const dxf = new DxfWriter();
        dxf.setUnits('Millimeters');
        dxf.addLayer('WALLS', DxfWriter.ACI.WHITE, 'CONTINUOUS');
        dxf.setActiveLayer('WALLS');

        rooms.forEach((r) => {
            const x = r.x;
            const y = -r.y;
            const w = r.w;
            const h = r.h;
            
            // Draw 4 lines for the rectangle
            dxf.drawLine(x, y, x + w, y); // Top
            dxf.drawLine(x + w, y, x + w, y - h); // Right
            dxf.drawLine(x + w, y - h, x, y - h); // Bottom
            dxf.drawLine(x, y - h, x, y); // Left
        });

        const dxfString = dxf.toDxfString();

        return Response.json({
            dxf: dxfString,
            rooms: rooms
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
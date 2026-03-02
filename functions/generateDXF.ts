import { createClientFromRequest } from 'npm:@base44/sdk@0.8.18';
import Drawing from 'npm:dxf-writer@1.12.0';

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

        // Build DXF using dxf-writer
        const d = new Drawing();
        d.setUnits('Millimeters');
        d.addLayer('WALLS', Drawing.ACI.CYAN, 'CONTINUOUS');
        d.addLayer('TEXT', Drawing.ACI.GREEN, 'CONTINUOUS');

        rooms.forEach(r => {
            // Note: Y is inverted in CAD vs screen
            const x = r.x;
            const y = -r.y;
            const w = r.w;
            const h = r.h; // Note height direction (going down means negative Y)

            d.setActiveLayer('WALLS');
            // Draw 4 walls (polyline or individual lines)
            d.drawLine(x, y, x + w, y);
            d.drawLine(x + w, y, x + w, y - h);
            d.drawLine(x + w, y - h, x, y - h);
            d.drawLine(x, y - h, x, y);

            // Add Text label
            d.setActiveLayer('TEXT');
            const cx = x + (w / 2);
            const cy = y - (h / 2);
            d.drawText(cx, cy, 150, 0, r.name, 'center', 'middle');
        });

        const dxfString = d.toDxfString();

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
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

        // Build DXF content
        let dxf = `0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1009\n0\nENDSEC\n`;
        dxf += `0\nSECTION\n2\nTABLES\n`;
        dxf += `0\nTABLE\n2\nLAYER\n70\n2\n`;
        dxf += `0\nLAYER\n2\nWALLS\n70\n0\n62\n7\n0\n`; // Cyan
        dxf += `0\nLAYER\n2\nTEXT\n70\n0\n62\n3\n0\n`; // Green
        dxf += `0\nENDTAB\n0\nENDSEC\n`;
        
        dxf += `0\nSECTION\n2\nENTITIES\n`;

        rooms.forEach(r => {
            // Draw 4 walls for each room
            const pts = [
                { x: r.x, y: r.y },
                { x: r.x + r.w, y: r.y },
                { x: r.x + r.w, y: r.y + r.h },
                { x: r.x, y: r.y + r.h }
            ];

            for (let i = 0; i < 4; i++) {
                const p1 = pts[i];
                const p2 = pts[(i + 1) % 4];
                dxf += `0\nLINE\n8\nWALLS\n`;
                dxf += `10\n${p1.x}\n20\n${-p1.y}\n30\n0.0\n`; // Note: Y is usually inverted in CAD vs screen
                dxf += `11\n${p2.x}\n21\n${-p2.y}\n31\n0.0\n`;
            }

            // Add Text label
            const cx = r.x + (r.w / 2);
            const cy = r.y + (r.h / 2);
            dxf += `0\nTEXT\n8\nTEXT\n`;
            dxf += `10\n${cx}\n20\n${-cy}\n30\n0.0\n40\n150.0\n1\n${r.name}\n`; // height 150mm
            dxf += `72\n1\n11\n${cx}\n21\n${-cy}\n31\n0.0\n`; // Center aligned
        });

        dxf += `0\nENDSEC\n0\nEOF\n`;

        return new Response(dxf, {
            headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Disposition': 'attachment; filename="floorplan.dxf"'
            }
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
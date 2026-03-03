import { createClientFromRequest } from 'npm:@base44/sdk@0.8.18';
import { jsPDF } from 'npm:jspdf@4.0.0';

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
            prompt = `Carefully analyze this floorplan image. Extract the exact layout to create a highly accurate floorplan.
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

        // Build PDF using jsPDF
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        if (rooms.length > 0) {
            const pageWidth = 297;
            const pageHeight = 210;

            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            rooms.forEach(r => {
                if (r.x < minX) minX = r.x;
                if (r.y < minY) minY = r.y;
                if (r.x + r.w > maxX) maxX = r.x + r.w;
                if (r.y + r.h > maxY) maxY = r.y + r.h;
            });

            if (minX === Infinity) { minX = 0; minY = 0; maxX = 1000; maxY = 1000; }

            const fpWidth = maxX - minX;
            const fpHeight = maxY - minY;

            const padding = 15;
            const scale = Math.min(
                (pageWidth - 2 * padding) / Math.max(fpWidth, 1),
                (pageHeight - 2 * padding) / Math.max(fpHeight, 1)
            );

            // Center the drawing
            const offsetX = padding - minX * scale + ((pageWidth - 2 * padding) - fpWidth * scale) / 2;
            const offsetY = padding - minY * scale + ((pageHeight - 2 * padding) - fpHeight * scale) / 2;

            doc.setDrawColor(0);
            doc.setLineWidth(0.5);

            rooms.forEach(r => {
                const rx = offsetX + r.x * scale;
                const ry = offsetY + r.y * scale;
                const rw = r.w * scale;
                const rh = r.h * scale;

                doc.rect(rx, ry, rw, rh);
                
                // Add room name text
                const fontSize = Math.min(10, rw / 2, rh / 2);
                if (fontSize >= 1) {
                    doc.setFontSize(fontSize);
                    const textWidth = doc.getTextWidth(r.name);
                    if (textWidth < rw - 2) {
                        doc.text(
                            r.name, 
                            rx + rw / 2, 
                            ry + rh / 2, 
                            { align: 'center', baseline: 'middle' }
                        );
                    }
                }
            });
        }

        const pdfDataUri = doc.output('datauristring');

        return Response.json({
            pdfDataUri: pdfDataUri,
            rooms: rooms
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
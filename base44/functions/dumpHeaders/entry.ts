import { createClientFromRequest } from 'npm:@base44/sdk@0.8.18';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const headers = Object.fromEntries(req.headers.entries());
        await base44.asServiceRole.entities.Project.create({
            name: "Headers Dump: " + JSON.stringify(headers)
        });
        return Response.json({ headers });
    } catch(e) {
        return Response.json({ error: e.message });
    }
});
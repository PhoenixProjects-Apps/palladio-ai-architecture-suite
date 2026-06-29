import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const headers = Object.fromEntries(req.headers.entries());
        await base44.asServiceRole.entities.Project.create({
            name: "Headers Dump: " + JSON.stringify(headers)
        });
        return Response.json({ headers });
    } catch(e) {
        return Response.json({ error: e.message });
    }
});
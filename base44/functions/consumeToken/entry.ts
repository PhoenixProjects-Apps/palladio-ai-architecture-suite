import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        // Fetch the user to get the latest token balance
        const currentUser = await base44.asServiceRole.entities.User.get(user.id);
        const currentTokens = currentUser.tokens !== undefined ? currentUser.tokens : 10;
        
        if (currentTokens <= 0) {
            return Response.json({ error: 'Insufficient tokens', success: false }, { status: 403 });
        }
        
        await base44.asServiceRole.entities.User.update(user.id, {
            tokens: currentTokens - 1
        });
        
        return Response.json({ success: true, tokens: currentTokens - 1 });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
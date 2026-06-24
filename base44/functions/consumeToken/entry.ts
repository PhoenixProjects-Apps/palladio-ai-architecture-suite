import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        // Parse the request body to get the token amount (default: 1)
        let amount = 1;
        try {
            const body = await req.json();
            if (body && typeof body.amount === 'number' && body.amount > 0) {
                amount = body.amount;
            }
        } catch (e) {
            // No body or invalid JSON — default to 1 token
        }
        
        // Fetch the user to get the latest token balance
        const currentUser = await base44.asServiceRole.entities.User.get(user.id);
        const currentTokens = currentUser.tokens !== undefined ? currentUser.tokens : 5;
        
        if (currentTokens < amount) {
            return Response.json({ 
                error: `Insufficient tokens. This action requires ${amount} token(s), but you have ${currentTokens}.`, 
                success: false,
                required: amount,
                available: currentTokens
            }, { status: 403 });
        }
        
        const newBalance = currentTokens - amount;
        await base44.asServiceRole.entities.User.update(user.id, {
            tokens: newBalance
        });
        
        return Response.json({ success: true, tokens: newBalance, consumed: amount });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
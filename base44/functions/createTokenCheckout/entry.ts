import { createClientFromRequest } from 'npm:@base44/sdk@0.8.18';
import Stripe from 'npm:stripe@14.14.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

const TOKEN_PACK_PRICE_ID = Deno.env.get("TOKEN_PACK_PRICE_ID");

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Authentication required' }, { status: 401 });
        }

        const origin = req.headers.get('origin') || "https://example.com";

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: [
                {
                    price: TOKEN_PACK_PRICE_ID,
                    quantity: 1,
                },
            ],
            customer_email: user.email,
            success_url: `${origin}/`,
            cancel_url: `${origin}/PalladioPricing`,
            metadata: {
                base44_app_id: Deno.env.get("BASE44_APP_ID"),
                purchase_type: 'token_pack',
                token_amount: '100',
                user_email: user.email,
            },
        });

        return Response.json({ url: session.url });
    } catch (error) {
        console.error("Error creating token pack checkout session:", error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});
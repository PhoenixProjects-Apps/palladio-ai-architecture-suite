import { createClientFromRequest } from 'npm:@base44/sdk@0.8.18';
import Stripe from 'npm:stripe@14.14.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await req.json();
        const { priceId, planType } = payload;
        const origin = req.headers.get('origin') || "https://example.com";

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'subscription',
            customer_email: user.email,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            success_url: `${origin}/`,
            cancel_url: `${origin}/PalladioPricing`,
            metadata: {
                base44_app_id: Deno.env.get("BASE44_APP_ID"),
                plan_type: planType,
            },
        });

        return Response.json({ url: session.url });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
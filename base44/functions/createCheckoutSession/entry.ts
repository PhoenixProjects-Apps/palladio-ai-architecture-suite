import { createClientFromRequest } from 'npm:@base44/sdk@0.8.18';
import Stripe from 'npm:stripe@14.14.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Authentication required' }, { status: 401 });
        }

        const payload = await req.json();
        const { planType } = payload;
        const originHeader = req.headers.get('origin') || "https://example.com";
        const isValidOrigin = originHeader.startsWith("http://localhost") || originHeader.endsWith(".base44.app");
        const origin = isValidOrigin ? originHeader : "https://example.com";

        const planMapping: Record<string, string> = {
            'palladio_monthly': 'price_1Tlv99RODDkwX6GssAYICx9u',
            'palladio_annual': 'price_1Tlv9ARODDkwX6Gs5Y7jxGOe'
        };

        const resolvedPriceId = planMapping[planType];
        if (!resolvedPriceId) {
            return Response.json({ error: 'Invalid plan type' }, { status: 400 });
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'subscription',
            line_items: [
                {
                    price: resolvedPriceId,
                    quantity: 1,
                },
            ],
            customer_email: user.email,
            success_url: `${origin}/`,
            cancel_url: `${origin}/PalladioPricing`,
            metadata: {
                base44_app_id: Deno.env.get("BASE44_APP_ID"),
                plan_type: planType,
                user_email: user.email,
            },
        });

        return Response.json({ url: session.url });
    } catch (error) {
        console.error("Error creating checkout session:", error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});
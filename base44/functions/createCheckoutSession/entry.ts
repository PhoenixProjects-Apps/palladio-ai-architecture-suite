import Stripe from 'npm:stripe@14.14.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

Deno.serve(async (req) => {
    try {
        const payload = await req.json();
        const { priceId, planType } = payload;
        const origin = req.headers.get('origin') || "https://example.com";

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'subscription',
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
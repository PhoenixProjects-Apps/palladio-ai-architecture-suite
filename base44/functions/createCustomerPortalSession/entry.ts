import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@14.14.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { returnUrl } = await req.json();

        const originHeader = req.headers.get("origin") || "https://example.com";
        const isValidOrigin = originHeader.startsWith("http://localhost") || originHeader.endsWith(".base44.app");
        const safeOrigin = isValidOrigin ? originHeader : "https://example.com";
        
        let safeReturnUrl = safeOrigin;
        if (returnUrl && returnUrl.startsWith("/") && !returnUrl.startsWith("//")) {
            safeReturnUrl = `${safeOrigin}${returnUrl}`;
        }

        const subs = await base44.entities.Subscription.filter({ user_email: user.email });
        const activeSub = subs.find(s => s.status === 'active') || subs[0];

        if (!activeSub || !activeSub.stripe_customer_id) {
            return Response.json({ error: 'No active subscription found' }, { status: 400 });
        }

        const session = await stripe.billingPortal.sessions.create({
            customer: activeSub.stripe_customer_id,
            return_url: safeReturnUrl
        });

        return Response.json({ url: session.url });
    } catch (error) {
        console.error("Error creating portal session:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});
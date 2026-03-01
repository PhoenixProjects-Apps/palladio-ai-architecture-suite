import { createClientFromRequest } from 'npm:@base44/sdk@0.8.18';
import Stripe from 'npm:stripe@14.14.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

Deno.serve(async (req) => {
    const signature = req.headers.get("stripe-signature");
    const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    const bodyText = await req.text();
    let event;

    try {
        event = await stripe.webhooks.constructEventAsync(bodyText, signature, secret);
    } catch (err) {
        console.error("Webhook signature verification failed:", err.message);
        return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    
    try {
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const customerEmail = session.customer_details?.email || session.customer_email;
            const customerId = session.customer;
            const subscriptionId = session.subscription;
            const planType = session.metadata?.plan_type || 'palladio_monthly';
            
            const existingSubs = await base44.asServiceRole.entities.Subscription.filter({ user_email: customerEmail });
            
            if (existingSubs.length > 0) {
                await base44.asServiceRole.entities.Subscription.update(existingSubs[0].id, {
                    stripe_customer_id: customerId,
                    stripe_subscription_id: subscriptionId,
                    plan_type: planType,
                    status: 'active'
                });
            } else {
                await base44.asServiceRole.entities.Subscription.create({
                    user_email: customerEmail,
                    stripe_customer_id: customerId,
                    stripe_subscription_id: subscriptionId,
                    plan_type: planType,
                    status: 'active'
                });
            }
        }
        
        if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
            const subscription = event.data.object;
            const customerId = subscription.customer;
            
            const existingSubs = await base44.asServiceRole.entities.Subscription.filter({ stripe_customer_id: customerId });
            
            if (existingSubs.length > 0) {
                await base44.asServiceRole.entities.Subscription.update(existingSubs[0].id, {
                    status: subscription.status,
                    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                    cancel_at_period_end: subscription.cancel_at_period_end
                });
            }
        }

        return new Response(JSON.stringify({ received: true }), { status: 200 });
    } catch (error) {
        console.error("Error processing webhook:", error);
        return new Response(`Error: ${error.message}`, { status: 500 });
    }
});
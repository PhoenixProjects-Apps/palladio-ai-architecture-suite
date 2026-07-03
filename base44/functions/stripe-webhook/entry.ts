import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@14.14.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

async function grantCredits(base44, email, amount) {
  if (!email) return;
  const existing = await base44.asServiceRole.entities.UserCredits.filter({ user_email: email });
  if (existing.length > 0) {
    await base44.asServiceRole.entities.UserCredits.update(existing[0].id, {
      tokens: (existing[0].tokens ?? 0) + amount
    });
  } else {
    await base44.asServiceRole.entities.UserCredits.create({ user_email: email, tokens: amount });
  }
}

Deno.serve(async (req) => {
    if (req.headers.get("authorization")) {
        return new Response("Webhook endpoints do not accept user authorization", { status: 403 });
    }

    const signature = req.headers.get("stripe-signature");
    const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!secret || secret.trim() === '') {
        console.error("Missing STRIPE_WEBHOOK_SECRET");
        return new Response("Webhook secret not configured", { status: 500 });
    }
    
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
            const purchaseType = session.metadata?.purchase_type;
            
            // One-time token pack purchase — grant tokens, no subscription record
            if (purchaseType === 'token_pack') {
                const tokenAmount = parseInt(session.metadata?.token_amount || '100', 10);
                await grantCredits(base44, customerEmail, tokenAmount);
                console.log(`Granted ${tokenAmount} tokens to ${customerEmail} via token pack purchase`);
                return new Response(JSON.stringify({ received: true }), { status: 200 });
            }
            
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

            // Grant 100 tokens on new subscription checkout
            await grantCredits(base44, customerEmail, 100);
        }
        
        if (event.type === 'invoice.paid') {
            const invoice = event.data.object;
            // Only add tokens if it's a renewal (billing_reason is subscription_cycle)
            if (invoice.billing_reason === 'subscription_cycle') {
                const customerEmail = invoice.customer_email;
                if (customerEmail) {
                    await grantCredits(base44, customerEmail, 100);
                }
            }
        }

        if (event.type === 'invoice.payment_failed') {
            const invoice = event.data.object;
            const customerId = invoice.customer;
            const existingSubs = await base44.asServiceRole.entities.Subscription.filter({ stripe_customer_id: customerId });
            if (existingSubs.length > 0) {
                await base44.asServiceRole.entities.Subscription.update(existingSubs[0].id, {
                    status: 'past_due'
                });
            }
            console.log("Payment failed for customer:", customerId);
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
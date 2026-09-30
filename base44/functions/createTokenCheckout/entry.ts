import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import Stripe from 'npm:stripe@14.14.0';
import { secrets } from 'base44:runtime';

// Validated live Stripe Price for the Palladio Token Pack:
// product prod_UlSpJjI2f5MQWQ — $25.00 USD, one-time (verified active in live mode).
// This is the established server-side price configuration; the amount/price is
// never accepted from the client.
const TOKEN_PACK_PRICE_ID = 'price_1TlvtdRODDkwX6Gs3bEGIjRz';
const EXPECTED_PRICE = {
  product: 'prod_UlSpJjI2f5MQWQ',
  unit_amount: 2500,
  currency: 'usd',
  recurring: false
};
const PUBLISHED_APP_URL = 'https://palladio-ai-arch.base44.app';

export default async function(req) {
  try {
    const stripeKey = secrets.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      console.error('createTokenCheckout: STRIPE_SECRET_KEY is not configured');
      return Response.json({ error: 'Payments are not configured. Please contact support.' }, { status: 500 });
    }
    const stripe = new Stripe(stripeKey);

    const base44 = createClientFromRequest(req);
    // Public app: checkout must also work for unauthenticated visitors.
    // Pre-fill the checkout email only when the visitor is signed in.
    let userEmail = null;
    try {
      const user = await base44.auth.me();
      userEmail = user?.email || null;
    } catch (_) {
      userEmail = null;
    }

    // Fail closed: validate the configured price is exactly the intended live
    // token pack before creating any checkout session.
    const price = await stripe.prices.retrieve(TOKEN_PACK_PRICE_ID);
    const problems = [];
    if (price.active !== true) problems.push('price is inactive');
    if (price.recurring != null) problems.push('price is recurring but the token pack is one-time');
    if (price.unit_amount !== EXPECTED_PRICE.unit_amount) problems.push('price amount does not match the $25.00 token pack');
    if (price.currency !== EXPECTED_PRICE.currency) problems.push(`price currency is ${price.currency}, expected ${EXPECTED_PRICE.currency}`);
    if (price.product !== EXPECTED_PRICE.product) problems.push('price belongs to a different product than the Palladio Token Pack');
    if (problems.length > 0) {
      console.error('createTokenCheckout: token pack price validation failed:', problems.join('; '));
      return Response.json({ error: 'Token pack pricing is misconfigured. Please contact support.' }, { status: 500 });
    }

    // Only trusted origins are used for redirect URLs; fall back to the
    // published app URL when no Origin header is present.
    const originHeader = req.headers.get('origin');
    let origin = PUBLISHED_APP_URL;
    if (originHeader) {
      try {
        const url = new URL(originHeader);
        if (url.hostname === 'localhost' || url.hostname.endsWith('.localhost')
          || url.hostname === 'base44.app' || url.hostname.endsWith('.base44.app')) {
          origin = url.origin;
        }
      } catch (_) {
        // keep published-app fallback
      }
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price: TOKEN_PACK_PRICE_ID,
          quantity: 1
        }
      ],
      ...(userEmail ? { customer_email: userEmail } : {}),
      success_url: `${origin}/`,
      cancel_url: `${origin}/PalladioPricing`,
      metadata: {
        base44_app_id: secrets.get('BASE44_APP_ID'),
        purchase_type: 'token_pack',
        token_amount: '100',
        ...(userEmail ? { user_email: userEmail } : {})
      }
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Error creating token pack checkout session:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
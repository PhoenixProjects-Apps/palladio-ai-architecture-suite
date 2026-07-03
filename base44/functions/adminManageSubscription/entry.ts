import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (req.method === 'GET') {
      const subs = await base44.asServiceRole.entities.Subscription.list();
      return Response.json({ subscriptions: subs }, { status: 200 });
    }

    const { user_email, plan_type, status, sub_id } = await req.json();
    
    if (plan_type === 'none') {
      if (sub_id) {
        await base44.asServiceRole.entities.Subscription.update(sub_id, { status: 'canceled' });
      }
    } else {
      if (sub_id) {
        await base44.asServiceRole.entities.Subscription.update(sub_id, { plan_type, status });
      } else {
        await base44.asServiceRole.entities.Subscription.create({
          user_email,
          stripe_customer_id: 'manual_' + Date.now(),
          plan_type,
          status,
        });
      }
    }

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
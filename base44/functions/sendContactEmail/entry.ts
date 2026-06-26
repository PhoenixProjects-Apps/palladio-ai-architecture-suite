import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { name, email, message } = body || {};
    if (!name || !email || !message) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const subject = `New contact form message from ${name}`;
    const bodyText = `You have received a new message from the Palladio contact form.\n\nName: ${name}\nEmail: ${email}\n\nMessage:\n${message}`;

    // Always store the submission so it is captured reliably
    await base44.asServiceRole.entities.ContactMessage.create({ name, email, message });

    // Best-effort email delivery (only works if recipient is a registered app user)
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: 'admin@palladio-ai.app',
        subject,
        body: bodyText,
        from_name: 'Palladio Contact Form'
      });
    } catch (emailErr) {
      console.error('SendEmail failed (recipient may not be a registered user):', emailErr.message);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('sendContactEmail error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
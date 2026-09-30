import { createClientFromRequest } from 'npm:@base44/sdk@0.8.18';

// Input shape (platform workflow engine — do not change):
//   { event: { type, entity_name, entity_id }, data: <Project record>,
//     args: { internal_secret: string } }
//   (direct invocations may pass internal_secret at the top level instead)
// The internal secret authenticates the workflow engine; without it the
// endpoint fails closed and no notifications are created.
export default async function(req) {
  try {
    const payload = await req.json().catch(() => ({}));
    const { event, data } = payload || {};
    // The workflow engine nests the step's arguments under `payload.args`;
    // direct invocations may pass the secret at the top level.
    const internal_secret = payload?.internal_secret ?? payload?.args?.internal_secret;

    // Fail-closed authentication against INTERNAL_AUTOMATION_SECRET.
    // Missing or weak configuration means "deny everything" — delivery stays
    // paused until the owner sets the secret in Settings → Secrets.
    const expectedSecret = Deno.env.get('INTERNAL_AUTOMATION_SECRET');
    if (!expectedSecret || expectedSecret.length < 16) {
      console.error('onProjectUpdate: INTERNAL_AUTOMATION_SECRET is not configured — notification delivery is paused. Set it in Settings → Secrets (must match the workflow internal_secret argument).');
      return Response.json({ error: 'Notification delivery is not configured' }, { status: 401 });
    }
    if (!internal_secret || internal_secret.length !== expectedSecret.length) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    let match = 0;
    for (let i = 0; i < expectedSecret.length; i++) {
      match |= expectedSecret.charCodeAt(i) ^ internal_secret.charCodeAt(i);
    }
    if (match !== 0) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (event?.type !== 'update' || !data?.id) {
      console.log('onProjectUpdate: ignoring payload without update event/data');
      return Response.json({ success: true, ignored: true });
    }

    // Owner lookup via the project's owner relationship:
    // Project.created_by_id (a user id) -> User record -> email.
    const ownerId = data.created_by_id;
    if (!ownerId) {
      console.log(`onProjectUpdate: project ${data.id} has no owner id — no notification sent`);
      return Response.json({ success: true, ignored: true });
    }
    const base44 = createClientFromRequest(req);
    let owner = null;
    try {
      owner = await base44.asServiceRole.entities.User.get(ownerId);
    } catch (_) {
      owner = null;
    }
    if (!owner?.email) {
      console.log(`onProjectUpdate: owner ${ownerId} not found — no notification sent`);
      return Response.json({ success: true, ignored: true });
    }

    // Preserve the owner's notification preference semantics.
    const prefs = owner.notification_preferences || { project_updates: true };
    if (prefs.project_updates === false) {
      return Response.json({ success: true, skipped: 'preference' });
    }

    // Best-effort idempotency claim keyed to project + revision (updated_date).
    // NOTE: this check-then-create is NOT atomic on this platform — a narrow
    // duplicate window remains if the identical event is delivered twice within
    // milliseconds. The primary duplicate source (duplicate workflow
    // definitions) is fixed at the workflow level.
    const dedupeKey = `project_update:${data.id}:${data.updated_date}`;
    const seen = await base44.asServiceRole.entities.Notification.filter({ description: dedupeKey });
    if (seen.length > 0) {
      return Response.json({ success: true, duplicate: true });
    }

    await base44.asServiceRole.entities.Notification.create({
      user_email: owner.email,
      title: 'Project Updated',
      message: `Project "${data.name}" was updated`,
      description: dedupeKey
    });
    return Response.json({ success: true });
  } catch (error) {
    console.error('onProjectUpdate error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
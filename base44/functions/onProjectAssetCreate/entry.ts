import { createClientFromRequest } from 'npm:@base44/sdk@0.8.18';

// Input shape (platform workflow engine — do not change):
//   { event: { type, entity_name, entity_id }, data: <ProjectAsset record>,
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
    const expectedSecret = Deno.env.get('INTERNAL_AUTOMATION_SECRET');
    if (!expectedSecret || expectedSecret.length < 16) {
      console.error('onProjectAssetCreate: INTERNAL_AUTOMATION_SECRET is not configured — notification delivery is paused. Set it in Settings → Secrets (must match the workflow internal_secret argument).');
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

    if (event?.type !== 'create' || !data?.id) {
      console.log('onProjectAssetCreate: ignoring payload without create event/data');
      return Response.json({ success: true, ignored: true });
    }

    const base44 = createClientFromRequest(req);

    // Resolve the owning project, then the owner via the project's owner
    // relationship: Project.created_by_id (a user id) -> User record -> email.
    if (!data.project_id) {
      console.log(`onProjectAssetCreate: asset ${data.id} has no project_id — no notification sent`);
      return Response.json({ success: true, ignored: true });
    }
    let project = null;
    try {
      project = await base44.asServiceRole.entities.Project.get(data.project_id);
    } catch (_) {
      project = null;
    }
    if (!project?.created_by_id) {
      console.log(`onProjectAssetCreate: project ${data.project_id} not found or has no owner — no notification sent`);
      return Response.json({ success: true, ignored: true });
    }
    let owner = null;
    try {
      owner = await base44.asServiceRole.entities.User.get(project.created_by_id);
    } catch (_) {
      owner = null;
    }
    if (!owner?.email) {
      console.log(`onProjectAssetCreate: owner ${project.created_by_id} not found — no notification sent`);
      return Response.json({ success: true, ignored: true });
    }

    // Preserve the owner's notification preference semantics.
    const prefs = owner.notification_preferences || { file_uploads: true };
    if (prefs.file_uploads === false) {
      return Response.json({ success: true, skipped: 'preference' });
    }

    // Best-effort idempotency claim keyed to the created asset. NOT atomic —
    // see onProjectUpdate for the documented residual duplicate window.
    const dedupeKey = `project_asset_create:${data.id}`;
    const seen = await base44.asServiceRole.entities.Notification.filter({ description: dedupeKey });
    if (seen.length > 0) {
      return Response.json({ success: true, duplicate: true });
    }

    await base44.asServiceRole.entities.Notification.create({
      user_email: owner.email,
      title: 'New File Added',
      message: `File "${data.file_name}" was added to project "${project.name}"`,
      description: dedupeKey
    });
    return Response.json({ success: true });
  } catch (error) {
    console.error('onProjectAssetCreate error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
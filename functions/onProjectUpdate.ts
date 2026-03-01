import { createClientFromRequest } from 'npm:@base44/sdk@0.8.18';

Deno.serve(async (req) => {
    try {
        const payload = await req.json();
        const { event, data } = payload;
        
        if (event.type === 'update') {
            const base44 = createClientFromRequest(req);
            
            const users = await base44.asServiceRole.entities.User.filter({ email: data.created_by });
            const user = users[0];
            
            const prefs = user?.notification_preferences || { project_updates: true };
            if (prefs.project_updates !== false) {
                await base44.asServiceRole.entities.Notification.create({
                    user_email: data.created_by,
                    title: "Project Updated",
                    message: `Project "${data.name}" was updated`,
                    link: `Projects`
                });
            }
        }
        return Response.json({ success: true });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
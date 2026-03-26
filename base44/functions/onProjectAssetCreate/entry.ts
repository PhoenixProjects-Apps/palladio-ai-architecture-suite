import { createClientFromRequest } from 'npm:@base44/sdk@0.8.18';

Deno.serve(async (req) => {
    try {
        const payload = await req.json();
        const { event, data } = payload;
        
        if (event.type === 'create') {
            const base44 = createClientFromRequest(req);
            
            // Get project to find the owner
            const project = await base44.asServiceRole.entities.Project.get(data.project_id);
            if (!project) return Response.json({ success: true });
            
            // Get user to check preferences
            const users = await base44.asServiceRole.entities.User.filter({ email: project.created_by });
            const user = users[0];
            
            const prefs = user?.notification_preferences || { file_uploads: true };
            if (prefs.file_uploads !== false) {
                await base44.asServiceRole.entities.Notification.create({
                    user_email: project.created_by,
                    title: "New File Added",
                    message: `File "${data.file_name}" was added to project "${project.name}"`,
                    link: `Projects`
                });
            }
        }
        return Response.json({ success: true });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
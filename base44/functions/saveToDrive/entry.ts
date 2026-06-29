import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { fileUrl, fileName } = await req.json();

        if (!fileUrl || !fileName) {
            return Response.json({ error: 'Missing fileUrl or fileName' }, { status: 400 });
        }
        
        try {
            const urlObj = new URL(fileUrl);
            if (!['firebasestorage.googleapis.com', 'storage.googleapis.com'].includes(urlObj.hostname)) {
                return Response.json({ error: 'Invalid fileUrl domain' }, { status: 400 });
            }
        } catch {
            return Response.json({ error: 'Invalid fileUrl format' }, { status: 400 });
        }

        const assets = await base44.entities.ProjectAsset.filter({ file_url: fileUrl });
        if (assets.length === 0) {
            return Response.json({ error: 'File not found or unauthorized' }, { status: 403 });
        }

        const asset = assets[0];
        const projects = await base44.entities.Project.filter({ id: asset.project_id });
        if (projects.length === 0 || projects[0].created_by_id !== user.id) {
            return Response.json({ error: 'Unauthorized: You do not own the associated project.' }, { status: 403 });
        }

        const accessToken = await base44.asServiceRole.connectors.getAccessToken("googledrive");

        if (!accessToken) {
            return Response.json({ error: 'Google Drive not authorized' }, { status: 403 });
        }

        // Fetch the file content
        const fileRes = await fetch(fileUrl);
        if (!fileRes.ok) throw new Error("Failed to fetch file");
        const fileBlob = await fileRes.blob();

        const metadata = { name: fileName };
        
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', fileBlob);

        const driveRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            body: form
        });

        if (!driveRes.ok) {
            const errorText = await driveRes.text();
            throw new Error(`Drive upload failed: ${errorText}`);
        }

        const result = await driveRes.json();

        return Response.json({ success: true, fileId: result.id });

    } catch (error) {
        console.error(error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});
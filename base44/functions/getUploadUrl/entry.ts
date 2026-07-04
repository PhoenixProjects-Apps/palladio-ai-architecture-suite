import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { Storage } from 'npm:@google-cloud/storage';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    
    if (!user) return Response.json({ error: "Unauthorized access" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { fileName, fileType } = body;
    
    if (!fileName || !fileType) return Response.json({ error: "Missing file details" }, { status: 400 });

    const safeFileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "");
    const uniqueFileName = `${crypto.randomUUID()}-${safeFileName}`;
    const filePath = `plan-assessments/${user.id}/${uniqueFileName}`;

    const serviceAccountEnv = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");
    if (!serviceAccountEnv) {
      console.error("Missing FIREBASE_SERVICE_ACCOUNT_JSON env var");
      return Response.json({ error: "Storage not configured on server" }, { status: 500 });
    }
    
    const credentials = JSON.parse(serviceAccountEnv);
    const storage = new Storage({ credentials });
    
    const bucketName = 'palladio-ai.firebasestorage.app';
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(filePath);

// 4. Generate the Signed URL for your app to UPLOAD the file (valid for 15 minutes)
    const [uploadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000,
      contentType: fileType,
    });

    // 5. Generate a second Signed URL for the AI to READ the file (valid for 2 hours)
    const [readUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 2 * 60 * 60 * 1000, 
    });

    // Send the secure read URL to the frontend so it can be passed to the AI
    return Response.json({ 
      uploadUrl, 
      file_url: readUrl 
    }, { status: 200 });

  } catch (error) {
    console.error("getUploadUrl fatal error:", error);
    return Response.json({ error: "Failed to generate upload URL" }, { status: 500 });
  }
});
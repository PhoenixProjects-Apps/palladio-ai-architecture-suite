import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { Storage } from 'npm:@google-cloud/storage';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    
    if (!user) {
      return Response.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { fileName, fileType } = body;
    
    if (!fileName || !fileType) {
      return Response.json({ error: "Missing file details" }, { status: 400 });
    }

    // 1. Sanitize the filename to prevent directory traversal attacks
    const safeFileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "");
    
    // 2. Make the file unique to avoid overwrites
    const uniqueFileName = `${crypto.randomUUID()}-${safeFileName}`;
    
    // We isolate files by user ID for better security and organization
    const filePath = `plan-assessments/${user.id}/${uniqueFileName}`;

    // 3. Authenticate with Google Cloud / Firebase
    // You must add your Firebase Service Account JSON string to Deno's environment variables
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

    // 4. Generate the Signed URL for a PUT upload (valid for 15 minutes)
    const [uploadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000,
      contentType: fileType,
    });

    // 5. Construct the public/read URL that the AI Superagent will use to download and analyze it
    const encodedPath = encodeURIComponent(filePath);
    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media`;

    return Response.json({ 
      uploadUrl, 
      file_url: publicUrl 
    }, { status: 200 });

  } catch (error) {
    console.error("getUploadUrl fatal error:", error);
    return Response.json({ error: "Failed to generate upload URL" }, { status: 500 });
  }
});
import { base44 } from '@/api/base44Client';

export const validateUpload = (file, allowedTypes, maxMb = 25) => {
  if (!file) return 'No file selected.';
  if (allowedTypes && !allowedTypes.some((type) => file.type === type || file.type.startsWith(type))) {
    return 'Unsupported file type.';
  }
  if (file.size > maxMb * 1024 * 1024) {
    return `File is too large. Maximum size is ${maxMb}MB.`;
  }
  return null;
};

export async function uploadToFirebase(file) {
  try {
    // 1. Get the pre-signed URL from our backend function
    const authRes = await base44.functions.invoke('getUploadUrl', {
      fileName: file.name || 'upload.bin',
      fileType: file.type || 'application/octet-stream'
    });

    const { uploadUrl, file_url, error } = authRes.data || {};
    if (error) throw new Error(error);
    if (!uploadUrl || !file_url) throw new Error('Could not secure upload permission');

    // 2. Upload the file directly to the pre-signed URL
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
      },
    });

    if (!uploadRes.ok) {
      throw new Error(`Direct upload failed with status: ${uploadRes.status}`);
    }

    // 3. Return the public URL
    return { file_url };
  } catch (err) {
    console.warn("Direct upload failed (likely CORS), falling back to Base44 Core UploadFile:", err);
    
    // Fallback: Use Base44 internal storage integration if Firebase fails
    const res = await base44.integrations.Core.UploadFile({ file });
    return { file_url: res.file_url || res.url };
  }
}
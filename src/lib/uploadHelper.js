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

// Secure upload for confidential plan documents:
// private storage + short-lived signed URL the AI can read.
export async function uploadSecureFile(file) {
  const upload = await base44.integrations.Core.UploadPrivateFile({ file });
  if (!upload?.file_uri) throw new Error('Upload failed');
  // Platform caps expires_in at 3600 seconds — requesting more fails the whole upload.
  const signed = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: upload.file_uri, expires_in: 3600 });
  if (!signed?.signed_url) throw new Error('Could not generate a secure access URL');
  return { file_url: signed.signed_url, file_uri: upload.file_uri };
}

// Re-sign a previously uploaded private file (signed URLs expire after 1 hour,
// so AI calls made long after upload need a fresh URL).
export async function refreshSignedUrl(fileUri) {
  const signed = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: fileUri, expires_in: 3600 });
  if (!signed?.signed_url) throw new Error('Could not generate a secure access URL');
  return signed.signed_url;
}

// Permanent, shareable URL for assets saved into projects (reports, exports, logos).
export async function uploadPublicFile(file) {
  const res = await base44.integrations.Core.UploadPublicFile({ file });
  const url = res?.file_url || res?.url;
  if (!url) throw new Error('Upload failed');
  return { file_url: url };
}
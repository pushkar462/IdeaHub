/** Resolve attachment URL to a full path the browser can fetch */
export function getAttachmentUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;

  const apiBase = import.meta.env.VITE_API_URL ?? '/api';
  // Strip /api suffix to get server origin for static files
  const serverOrigin = apiBase.replace(/\/api\/?$/, '') || '';
  return `${serverOrigin}${url.startsWith('/') ? url : `/${url}`}`;
}

export const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return 'File is too large. Maximum size is 10MB.';
  }
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return 'Unsupported file format. Allowed: JPG, PNG, WEBP, PDF, TXT, DOC, DOCX.';
  }
  return null;
}

export function parseUploadError(err: any): string {
  const code = err.response?.data?.code;
  const message = err.response?.data?.message;

  if (code === 'FILE_TOO_LARGE' || code === 'LIMIT_FILE_SIZE') {
    return 'File is too large. Maximum size is 10MB.';
  }
  if (code === 'INVALID_FILE_TYPE') {
    return 'Unsupported file format.';
  }
  if (code === 'FILE_SPOOF_DETECTED') {
    return 'File validation failed. The file may be corrupted or spoofed.';
  }
  if (code === 'UPLOAD_FAILED') {
    return message || 'Upload failed. Please try again.';
  }
  if (code === 'FORBIDDEN') {
    return 'Permission denied.';
  }
  if (message) return message;
  return 'Upload failed. Please try again.';
}

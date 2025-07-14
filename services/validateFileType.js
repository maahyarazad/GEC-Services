const path = require('path');
const { fromFile, fromBuffer } = require('file-type');
const isTextFile = require('istextorbinary').isText;

// Update as needed
const FALLBACK_MIME_TYPES = {
  csv: 'text/csv',
  txt: 'text/plain',
  md: 'text/markdown',
};

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/rtf',
  'application/zip',
];

async function validateFileMimeType(file) {
  if (!file || !file.buffer) return { valid: true }; // If no file provided, consider it valid

  const fileBuffer = file.buffer;
  let type = await fromBuffer(fileBuffer);
  let mimeType = type?.mime;

  if (!mimeType) {
    const isText = isTextFile(null, fileBuffer);
    if (isText) {
      const originalExt = path.extname(file.originalname).toLowerCase().replace('.', '');
      mimeType = FALLBACK_MIME_TYPES[originalExt] || 'text/plain';
    }
  }

  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return {
      valid: false,
      reason: 'Invalid file type.',
      mime: mimeType || 'unknown',
    };
  }

  return { valid: true, mime: mimeType };
}

module.exports = { validateFileMimeType };

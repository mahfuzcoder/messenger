import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { v2 as cloudinary } from 'cloudinary';

const allowedDocumentTypes = new Set([
  'application/pdf', 'text/plain', 'text/csv', 'application/rtf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip'
]);

function mediaKind(mimetype) {
  if (/^(image|video|audio)\//.test(mimetype)) return mimetype.split('/')[0];
  return 'file';
}

// Local directory used by the disk fallback; remembered so replaced files can be removed later.
let storageDir = '';

export function createUploader(uploadDir) {
  storageDir = uploadDir;
  return multer({
    storage: multer.diskStorage({
      destination: uploadDir,
      filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname).toLowerCase()}`)
    }),
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = /^(image|video|audio)\//.test(file.mimetype) || allowedDocumentTypes.has(file.mimetype);
      cb(allowed ? null : new Error('This file type is not supported.'), allowed);
    }
  });
}

export function cloudinaryEnabled() {
  return Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

// Applies the Cloudinary credentials from the environment before any upload/delete call.
function configureCloudinary() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

// Reads the resource type and public_id back out of a stored Cloudinary URL; null for other URLs.
function cloudinaryFile(url) {
  if (!url.includes('res.cloudinary.com')) return null;
  try {
    const [root, rest] = new URL(url).pathname.split('/upload/');
    if (!rest) return null;
    const segments = rest.split('/').filter(Boolean);
    if (/^v\d+$/.test(segments[0])) segments.shift(); // drop the version prefix
    return {
      resourceType: root.split('/').filter(Boolean).pop() || 'image',
      publicId: segments.join('/').replace(/\.[^./]+$/, '')
    };
  } catch {
    return null;
  }
}

// Deletes a previously stored file when its owner replaces it (avatar or group photo).
export async function removeStoredFile(url) {
  if (!url) return;
  if (url.startsWith('/uploads/') && storageDir) {
    fs.unlink(path.join(storageDir, path.basename(url)), () => {}); // basename blocks path traversal
    return;
  }
  const file = cloudinaryFile(url);
  if (file && cloudinaryEnabled()) {
    configureCloudinary();
    await cloudinary.uploader.destroy(file.publicId, { resource_type: file.resourceType }).catch(() => {});
  }
}

export async function persistFile(file) {
  if (cloudinaryEnabled()) {
    configureCloudinary();
    const result = await cloudinary.uploader.upload(file.path, { folder: 'nook-messenger', resource_type: 'auto' });
    fs.unlink(file.path, () => {});
    return { url: result.secure_url, type: mediaKind(file.mimetype), fileName: file.originalname };
  }
  return { url: `/uploads/${file.filename}`, type: mediaKind(file.mimetype), fileName: file.originalname };
}

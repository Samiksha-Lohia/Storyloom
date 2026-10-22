import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import config from '../config/env.js';
import { BadRequestError } from '../utilities/custom-errors.js';
import logger from '../utilities/logger.js';

let isConfigured = false;

function ensureCloudinaryConfig() {
  if (isConfigured) return;
  const { cloudName, apiKey, apiSecret } = config.cloudinary;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new BadRequestError(
      'Cloudinary configuration is missing. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.'
    );
  }
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
  isConfigured = true;
}

export const PRESETS = {
  cover: 'c_fill,w_600,h_900,f_auto,q_auto',
  thumb: 'c_fill,w_200,h_300,f_auto,q_auto',
  avatar: 'c_fill,w_256,h_256,g_face,f_auto,q_auto',
};

const getExtension = (mimetype) => {
  if (mimetype === 'image/png') return '.png';
  if (mimetype === 'image/webp') return '.webp';
  if (mimetype === 'image/gif') return '.gif';
  if (mimetype === 'image/svg+xml') return '.svg';
  return '.jpg';
};

export const saveLocalImage = async (buffer, { folder = 'platform/covers', mimetype } = {}) => {
  const subfolder = folder.includes('avatar') ? 'avatars' : 'covers';
  const uploadBase = config.file?.uploadDir || 'uploads';
  const targetDir = path.resolve(uploadBase, subfolder);

  await fs.promises.mkdir(targetDir, { recursive: true });

  const ext = getExtension(mimetype);
  const filename = `${crypto.randomUUID()}-${Date.now()}${ext}`;
  const filePath = path.join(targetDir, filename);

  await fs.promises.writeFile(filePath, buffer);

  const publicUrl = `/uploads/${subfolder}/${filename}`;
  return {
    publicId: publicUrl,
    url: publicUrl,
  };
};

export const saveImage = async (buffer, { folder = 'platform/covers', mimetype } = {}) => {
  if (process.env.MOCK_CLOUDINARY_FAIL === 'true') {
    throw new Error('Cloudinary simulated failure');
  }

  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new BadRequestError('Image buffer is required.');
  }

  // Attempt upload to Cloudinary first
  try {
    ensureCloudinaryConfig();

    return await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
        },
        (error, result) => {
          if (error) {
            return reject(error);
          }
          resolve({
            publicId: result.public_id,
            url: imageUrl(result.public_id, folder.includes('avatar') ? 'avatar' : 'cover') || result.secure_url,
          });
        }
      );
      uploadStream.end(buffer);
    });
  } catch (cloudinaryErr) {
    logger.warn(`Cloudinary upload failed (${cloudinaryErr.message}). Saving image locally instead.`);
    return await saveLocalImage(buffer, { folder, mimetype });
  }
};

export const deleteImage = async (publicId) => {
  if (!publicId) return;

  if (publicId.startsWith('/uploads/') || publicId.startsWith('uploads/')) {
    try {
      const cleanPath = publicId.replace(/^\//, '');
      const filePath = path.resolve(cleanPath);
      await fs.promises.unlink(filePath).catch(() => {});
      return;
    } catch (err) {
      logger.warn(`Failed to delete local image (${publicId}): ${err.message}`);
      return;
    }
  }

  try {
    ensureCloudinaryConfig();
    return await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    logger.warn(`Failed to delete Cloudinary image (${publicId}): ${err.message}`);
  }
};

export const imageUrl = (publicId, preset = 'cover') => {
  if (!publicId) return '';
  if (publicId.startsWith('/') || publicId.startsWith('http://') || publicId.startsWith('https://')) {
    return publicId;
  }
  try {
    ensureCloudinaryConfig();
    const transformation = PRESETS[preset] || preset;
    return cloudinary.url(publicId, {
      raw_transformation: transformation,
      secure: true,
    });
  } catch (_err) {
    return publicId;
  }
};

export default {
  saveImage,
  saveLocalImage,
  deleteImage,
  imageUrl,
  PRESETS,
};

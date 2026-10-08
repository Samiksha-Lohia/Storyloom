import { v2 as cloudinary } from 'cloudinary';
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

export const saveImage = async (buffer, { folder = 'platform/covers', mimetype } = {}) => {
  if (process.env.MOCK_CLOUDINARY_FAIL === 'true') {
    throw new Error('Cloudinary simulated failure');
  }

  ensureCloudinaryConfig();

  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new BadRequestError('Image buffer is required.');
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
      },
      (error, result) => {
        if (error) {
          logger.error(`Cloudinary upload failed: ${error.message}`);
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
};

export const deleteImage = async (publicId) => {
  if (!publicId) return;
  try {
    ensureCloudinaryConfig();
    return await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    logger.warn(`Failed to delete Cloudinary image (${publicId}): ${err.message}`);
  }
};

export const imageUrl = (publicId, preset = 'cover') => {
  if (!publicId) return '';
  ensureCloudinaryConfig();
  const transformation = PRESETS[preset] || preset;
  return cloudinary.url(publicId, {
    raw_transformation: transformation,
    secure: true,
  });
};

export default {
  saveImage,
  deleteImage,
  imageUrl,
  PRESETS,
};

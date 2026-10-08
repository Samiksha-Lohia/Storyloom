import fs from 'fs/promises';
import path from 'path';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import config from '../config/env.js';
import logger from '../utilities/logger.js';

let s3Client = null;
if (config.storage.provider === 's3') {
  s3Client = new S3Client({
    region: config.storage.s3.region,
    credentials: {
      accessKeyId: config.storage.s3.accessKeyId,
      secretAccessKey: config.storage.s3.secretAccessKey,
    },
  });
}

const uploadFile = async (file, storageKey) => {
  if (config.storage.provider === 's3') {
    const command = new PutObjectCommand({
      Bucket: config.storage.s3.bucketName,
      Key: storageKey,
      Body: file.buffer,
      ContentType: file.mimetype,
    });
    await s3Client.send(command);
    return `https://${config.storage.s3.bucketName}.s3.${config.storage.s3.region}.amazonaws.com/${storageKey}`;
  }

  if (file.path) {
    return path.resolve(file.path);
  }

  const destPath = path.join(config.file.uploadDir, storageKey);
  await fs.mkdir(path.dirname(destPath), { recursive: true });
  await fs.writeFile(destPath, file.buffer);
  return destPath;
};

const deleteFile = async (storageUrl, storageKey) => {
  if (config.storage.provider === 's3' && s3Client) {
    const command = new DeleteObjectCommand({
      Bucket: config.storage.s3.bucketName,
      Key: storageKey,
    });
    await s3Client.send(command);
    logger.debug(`Deleted S3 object: ${storageKey}`);
    return;
  }

  try {
    await fs.unlink(storageUrl);
    logger.debug(`Deleted local file: ${storageUrl}`);
  } catch (err) {
    logger.warn(`Could not delete local file at ${storageUrl}: ${err.message}`);
  }
};

const downloadFile = async (storageKey) => {
  if (config.storage.provider === 's3' && s3Client) {
    const command = new GetObjectCommand({
      Bucket: config.storage.s3.bucketName,
      Key: storageKey,
    });
    const response = await s3Client.send(command);
    const byteArray = await response.Body.transformToByteArray();
    return Buffer.from(byteArray);
  }
  throw new Error('S3 client not initialized or STORAGE_PROVIDER is not s3');
};

export { uploadFile, deleteFile, downloadFile };

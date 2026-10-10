import fs from 'fs/promises';
import path from 'path';
import config from '../config/env.js';
import logger from '../utilities/logger.js';

const uploadFile = async (file, storageKey) => {
  if (file.path) {
    return path.resolve(file.path);
  }

  const destPath = path.join(config.file.uploadDir, storageKey);
  await fs.mkdir(path.dirname(destPath), { recursive: true });
  await fs.writeFile(destPath, file.buffer);
  return destPath;
};

const deleteFile = async (storageUrl, storageKey) => {
  try {
    const target = storageUrl || (storageKey ? path.join(config.file.uploadDir, storageKey) : null);
    if (target) {
      await fs.unlink(target);
      logger.debug(`Deleted local file: ${target}`);
    }
  } catch (err) {
    logger.warn(`Could not delete local file: ${err.message}`);
  }
};

const downloadFile = async (storageKey) => {
  const filePath = path.isAbsolute(storageKey)
    ? storageKey
    : path.join(config.file.uploadDir, storageKey);
  return fs.readFile(filePath);
};

export { uploadFile, deleteFile, downloadFile };

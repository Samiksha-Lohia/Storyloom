import crypto from 'crypto';
import config from '../config/env.js';

export const getDayString = (date = new Date()) => {
  return date.toISOString().slice(0, 10);
};

export const getViewerKey = (req, day = getDayString()) => {
  if (req?.user?.id) {
    return req.user.id.toString();
  }

  const anonHeader = req.headers?.['x-anonymous-id'];
  const anonCookie = req.cookies?.['sc_anon_id'];
  const userAgent = req.headers?.['user-agent'] || 'generic-client';

  const rawId = anonHeader || anonCookie || `anon-${userAgent}`;
  const salt = `${config.jwt.accessSecret}:salt:${day}`;

  const hashed = crypto
    .createHash('sha256')
    .update(`${rawId}:${salt}`)
    .digest('hex')
    .slice(0, 32);

  return `anon_${hashed}`;
};

export default {
  getDayString,
  getViewerKey,
};

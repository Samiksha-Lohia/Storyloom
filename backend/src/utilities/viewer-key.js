import crypto from 'crypto';
import config from '../config/env.js';

/**
 * Gets UTC date string in 'YYYY-MM-DD' format.
 * @param {Date} [date] Optional date object (defaults to now)
 * @returns {string} 'YYYY-MM-DD'
 */
export const getDayString = (date = new Date()) => {
  return date.toISOString().slice(0, 10);
};

/**
 * Generates or extracts a privacy-preserving viewer key.
 *
 * Requirements:
 * - If user is logged in, viewerKey is the user's ID.
 * - For guests, hash an anonymous id (from x-anonymous-id header or cookie) with a daily salt.
 * - Never store raw IP addresses.
 *
 * @param {import('express').Request} req
 * @param {string} [day] Optional day string 'YYYY-MM-DD'
 * @returns {string} Deduplicating viewerKey
 */
export const getViewerKey = (req, day = getDayString()) => {
  if (req?.user?.id) {
    return req.user.id.toString();
  }

  // Check client first-party anonymous ID headers/cookies
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

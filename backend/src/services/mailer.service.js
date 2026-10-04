import logger from '../utilities/logger.js';

export const sendEmail = async ({ to, subject, text, html }) => {
  logger.info(`[Mailer] Simulated email to: ${to} | Subject: "${subject}"`);
  return { success: true, simulated: true, to, subject };
};

export default {
  sendEmail,
};

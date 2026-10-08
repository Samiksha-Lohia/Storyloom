import AuditLog from '../models/audit-log.model.js';
import logger from '../utilities/logger.js';

export const logAction = async ({ actor, action, targetType, targetId, meta = {} }) => {
  try {
    const entry = await AuditLog.create({
      actor,
      action,
      targetType,
      targetId: targetId ? targetId.toString() : '',
      meta,
      at: new Date(),
    });

    logger.info(`[AuditLog] Action="${action}" by Actor=${actor} on Target=${targetType}:${targetId}`);
    return entry;
  } catch (err) {
    logger.error(`[AuditLog] Failed to record audit log: ${err.message}`);
    return null;
  }
};

export default {
  logAction,
};

import * as reportService from '../services/report.service.js';
import { sendCreated, sendSuccess } from '../utilities/response.js';

export const createAppReport = async (req, res, next) => {
  try {
    const report = await reportService.createAppReport({
      reporterId: req.user.id,
      targetType: req.body.targetType,
      targetId: req.body.targetId,
      reason: req.body.reason,
      details: req.body.details,
      claimantName: req.body.claimantName,
      claimantContact: req.body.claimantContact,
    });
    sendCreated(res, report, 'Report submitted successfully. Our team will review it.');
  } catch (err) {
    next(err);
  }
};

export const createPublicNotice = async (req, res, next) => {
  try {
    const report = await reportService.createPublicNotice({
      targetType: req.body.targetType || 'book',
      targetId: req.body.targetId,
      reason: req.body.reason || 'copyright',
      details: req.body.details,
      claimantName: req.body.claimantName,
      claimantContact: req.body.claimantContact,
      honeypot: req.body.honeypot,
    });
    sendCreated(res, report, 'Takedown notice submitted successfully.');
  } catch (err) {
    next(err);
  }
};

export default {
  createAppReport,
  createPublicNotice,
};

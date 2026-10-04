import * as reportService from '../services/report.service.js';
import * as adminService from '../services/admin.service.js';
import { sendSuccess, sendPaginated } from '../utilities/response.js';

export const getStats = async (req, res, next) => {
  try {
    const stats = await adminService.getAdminStats();
    sendSuccess(res, stats, 200, 'Admin platform statistics retrieved.');
  } catch (err) {
    next(err);
  }
};

export const getReports = async (req, res, next) => {
  try {
    const result = await reportService.getReports({
      status: req.query.status,
      targetType: req.query.targetType,
      reason: req.query.reason,
      page: req.query.page,
      limit: req.query.limit,
    });
    sendSuccess(res, result, 200, 'Reports retrieved successfully.');
  } catch (err) {
    next(err);
  }
};

export const handleReport = async (req, res, next) => {
  try {
    const report = await reportService.handleReportAction(req.params.id, {
      adminUser: req.user,
      action: req.body.action,
      notes: req.body.notes,
    });
    sendSuccess(res, report, 200, `Report action "${req.body.action}" applied successfully.`);
  } catch (err) {
    next(err);
  }
};

export const getPublishers = async (req, res, next) => {
  try {
    const { results, pagination } = await adminService.getPublishers({
      status: req.query.status,
      page: req.query.page,
      limit: req.query.limit,
    });
    sendPaginated(res, results, pagination, 'Publishers retrieved successfully.');
  } catch (err) {
    next(err);
  }
};

export const reviewPublisher = async (req, res, next) => {
  try {
    const user = await adminService.reviewPublisher(req.params.id, {
      action: req.body.action,
      reason: req.body.reason,
      adminUser: req.user,
    });
    sendSuccess(res, user, 200, `Publisher application ${req.body.action}ed successfully.`);
  } catch (err) {
    next(err);
  }
};

export const getUsers = async (req, res, next) => {
  try {
    const { results, pagination } = await adminService.getUsers({
      search: req.query.search,
      role: req.query.role,
      status: req.query.status,
      page: req.query.page,
      limit: req.query.limit,
      sort: req.query.sort,
      order: req.query.order,
    });
    sendPaginated(res, results, pagination, 'Users retrieved successfully.');
  } catch (err) {
    next(err);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const user = await adminService.updateUser(req.params.id, {
      role: req.body.role,
      status: req.body.status,
      suspensionDays: req.body.suspensionDays,
      suspensionEndsAt: req.body.suspensionEndsAt,
      note: req.body.note,
      adminUser: req.user,
    });
    sendSuccess(res, user, 200, 'User updated successfully.');
  } catch (err) {
    next(err);
  }
};

export const getBooks = async (req, res, next) => {
  try {
    const { results, pagination } = await adminService.getBooks({
      search: req.query.search,
      genre: req.query.genre,
      status: req.query.status,
      page: req.query.page,
      limit: req.query.limit,
      sort: req.query.sort,
      order: req.query.order,
    });
    sendPaginated(res, results, pagination, 'Books retrieved successfully.');
  } catch (err) {
    next(err);
  }
};

export const updateBook = async (req, res, next) => {
  try {
    const book = await adminService.updateBook(req.params.id, {
      action: req.body.action,
      reason: req.body.reason,
      adminUser: req.user,
    });
    sendSuccess(res, book, 200, `Book ${req.body.action} action applied successfully.`);
  } catch (err) {
    next(err);
  }
};

export default {
  getStats,
  getReports,
  handleReport,
  getPublishers,
  reviewPublisher,
  getUsers,
  updateUser,
  getBooks,
  updateBook,
};

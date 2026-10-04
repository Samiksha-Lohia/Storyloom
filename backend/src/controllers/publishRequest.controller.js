import * as publishRequestService from '../services/publishRequest.service.js';
import {
  createPublishRequestSchema,
  updatePublishRequestSchema,
  listPublishRequestsSchema,
} from '../validators/publish-request.validator.js';
import { sendSuccess, sendCreated, sendPaginated } from '../utilities/response.js';
import { BadRequestError } from '../utilities/custom-errors.js';

export const create = async (req, res, next) => {
  try {
    const { error, value } = createPublishRequestSchema.validate(req.body);
    if (error) {
      throw new BadRequestError(error.details[0].message);
    }
    const request = await publishRequestService.createPublishRequest(req.user, value);
    return sendCreated(res, request, 'Publishing request submitted successfully.');
  } catch (err) {
    next(err);
  }
};

export const list = async (req, res, next) => {
  try {
    const { error, value } = listPublishRequestsSchema.validate(req.query);
    if (error) {
      throw new BadRequestError(error.details[0].message);
    }
    const result = await publishRequestService.listPublishRequests(req.user, value);
    return sendPaginated(
      res,
      result.results,
      result.pagination,
      'Publishing requests retrieved successfully.'
    );
  } catch (err) {
    next(err);
  }
};

export const getById = async (req, res, next) => {
  try {
    const request = await publishRequestService.getPublishRequestById(req.user, req.params.id);
    return sendSuccess(res, request, 200, 'Publishing request retrieved successfully.');
  } catch (err) {
    next(err);
  }
};

export const updateStatus = async (req, res, next) => {
  try {
    const { error, value } = updatePublishRequestSchema.validate(req.body);
    if (error) {
      throw new BadRequestError(error.details[0].message);
    }
    const result = await publishRequestService.updatePublishRequestStatus(req.user, req.params.id, value);
    return sendSuccess(res, result, 200, 'Publishing request updated successfully.');
  } catch (err) {
    next(err);
  }
};

export const blockPublisher = async (req, res, next) => {
  try {
    const writerId = req.user.id || req.user._id;
    const publisherId = req.params.publisherId;
    const { reason } = req.body || {};
    const block = await publishRequestService.blockPublisher(writerId, publisherId, reason);
    return sendSuccess(res, block, 200, 'Publisher blocked successfully.');
  } catch (err) {
    next(err);
  }
};

export const unblockPublisher = async (req, res, next) => {
  try {
    const writerId = req.user.id || req.user._id;
    const publisherId = req.params.publisherId;
    await publishRequestService.unblockPublisher(writerId, publisherId);
    return sendSuccess(res, { success: true }, 200, 'Publisher unblocked successfully.');
  } catch (err) {
    next(err);
  }
};

export const listBlockedPublishers = async (req, res, next) => {
  try {
    const writerId = req.user.id || req.user._id;
    const blocks = await publishRequestService.listBlockedPublishers(writerId);
    return sendSuccess(res, blocks, 200, 'Blocked publishers retrieved successfully.');
  } catch (err) {
    next(err);
  }
};

export default {
  create,
  list,
  getById,
  updateStatus,
  blockPublisher,
  unblockPublisher,
  listBlockedPublishers,
};

export const sendSuccess = (res, data, statusCode = 200, message = 'Success') => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

export const sendCreated = (res, data, message = 'Created') => {
  return sendSuccess(res, data, 201, message);
};

export const sendPaginated = (res, results, pagination, message = 'Success') => {
  return res.status(200).json({
    success: true,
    message,
    data: results,
    pagination,
  });
};

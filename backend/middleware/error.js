const ApiError = require('../utils/ApiError');

exports.notFound = (req, res, next) => next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));

// eslint-disable-next-line no-unused-vars
exports.errorHandler = (err, req, res, next) => {
  let status = err.statusCode || 500;
  let message = err.isOperational ? err.message : 'Something went wrong';
  let details = err.details;

  if (err.name === 'MulterError') {
    status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'Attachment must be ' + (req.uploadLimitMB || 5) + ' MB or smaller' : 'Invalid attachment';
  } else if (err.statusCode === 415 && err.message === 'Attachment must be a PDF, JPG, or PNG') {
    status = 415; message = err.message;
  } else if (err.name === 'ValidationError') {
    status = 422; message = 'Validation failed';
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err.name === 'CastError') {
    status = 400; message = `Invalid ${err.path}`;
  } else if (err.code === 11000) {
    status = 409; const f = Object.keys(err.keyValue || {})[0];
    message = `${f || 'Value'} already exists`;
  } else if (err.message === 'End time must be after start time') {
    status = 422; message = err.message;
  }

  if (status >= 500) console.error('Request failed:', require('../config/db').safeDatabaseError(err));
  res.status(status).json({
    success: false,
    message,
    ...(details ? { details } : {}),
  });
};



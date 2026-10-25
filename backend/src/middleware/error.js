const ApiError = require('../utils/ApiError');

exports.notFound = (req, res, next) => next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));

// eslint-disable-next-line no-unused-vars
exports.errorHandler = (err, req, res, next) => {
  let status = err.statusCode || 500;
  let message = err.isOperational ? err.message : 'Something went wrong';
  let details = err.details;

  if (err.name === 'ValidationError') {
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

  if (status >= 500) console.error(err);
  res.status(status).json({
    success: false,
    message,
    ...(details ? { details } : {}),
    ...(process.env.NODE_ENV === 'development' && status >= 500 ? { stack: err.stack } : {}),
  });
};

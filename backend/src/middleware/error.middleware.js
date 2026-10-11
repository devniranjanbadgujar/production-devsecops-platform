const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.status || err.statusCode || 500;

  const isClientError = statusCode >= 400 && statusCode < 500;
  const validStatus = statusCode >= 400 && statusCode < 600;

  res.status(validStatus ? statusCode : 500).json({
    status: 'error',
    message: isClientError ? err.message : 'Internal server error',
  });
};

module.exports = errorHandler;
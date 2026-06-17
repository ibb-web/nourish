function errorHandler(err, req, res, next) {
  console.error(err && err.stack ? err.stack : err);
  const status = err && err.status ? err.status : 500;
  const message = err && err.message ? err.message : 'Internal server error';
  if (res.headersSent) return next(err);
  res.status(status).json({ message });
}

module.exports = errorHandler;

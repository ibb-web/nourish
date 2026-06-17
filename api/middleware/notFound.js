function notFound(req, res, next) {
  res.status(404).json({ message: 'API route not found' });
}

module.exports = notFound;

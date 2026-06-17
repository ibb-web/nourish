const mongoose = require('mongoose');

function validateObjectId(req, res, next) {
  const id = req.params.id;
  if (!id) return next();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid id parameter' });
  }
  return next();
}

module.exports = validateObjectId;

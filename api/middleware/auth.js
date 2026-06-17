const User = require('../models/User');
const { verifyToken } = require('../utils/token');

async function auth(req, res, next) {
  const authHeader = req.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return next();
  const token = authHeader.slice(7).trim();
  try {
    const payload = verifyToken(token);
    if (payload && payload.sub) {
      const user = await User.findById(payload.sub).select('-password');
      if (user) req.user = user;
    }
  } catch (err) {
    // invalid token — ignore and continue as unauthenticated
    console.warn('Auth middleware: token verify failed');
  }
  return next();
}

module.exports = auth;

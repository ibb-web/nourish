const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const { signToken } = require('../utils/token');

const register = async (req, res) => {
  try {
    const { name, email, password, targetCalories } = req.body;
    if (!email || !password || !name) return res.status(400).json({ message: 'Missing fields' });

    const normalizedEmail = String(email).trim().toLowerCase();

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) return res.status(409).json({ message: 'Email already in use' });

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const parsedTargetCalories = targetCalories === '' || targetCalories === undefined || targetCalories === null
      ? null
      : Number(targetCalories);
    if (parsedTargetCalories !== null && (!Number.isFinite(parsedTargetCalories) || parsedTargetCalories < 0)) {
      return res.status(400).json({ message: 'Invalid targetCalories' });
    }

    const user = await User.create({
      name,
      email: normalizedEmail,
      password: hash,
      targetCalories: parsedTargetCalories,
    });

    const token = signToken({ sub: user._id.toString() });
    const safe = user.toObject();
    delete safe.password;

    return res.status(201).json({ user: safe, token });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Missing credentials' });

    const normalizedEmail = String(email).trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const token = signToken({ sub: user._id.toString() });
    const safe = user.toObject();
    delete safe.password;
    return res.json({ user: safe, token });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const me = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'unauthenticated' });
    return res.json(req.user);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Missing email' });

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    // Always respond with a success message to avoid user enumeration
    if (!user) return res.json({ message: 'If that email exists, a reset link was sent' });

    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    const resetUrl = `${req.protocol}://${req.get('host')}/reset-password?token=${token}`;
    console.log('Password reset link (dev):', resetUrl);

    return res.json({ message: 'If that email exists, a reset link was sent' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ message: 'Missing token or new password' });

    const user = await User.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ message: 'Invalid or expired token' });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    const tokenJwt = signToken({ sub: user._id.toString() });
    const safe = user.toObject();
    delete safe.password;
    return res.json({ user: safe, token: tokenJwt });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { register, login, me, forgotPassword, resetPassword };

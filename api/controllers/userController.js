const User = require('../models/User');

const getUsers = async (req, res) => {
	try {
		if (req.user?._id) {
			const user = await User.findById(req.user._id).select('-password');
			return res.json(user ? [user] : []);
		}

		const users = await User.find().select('-password').sort({ createdAt: -1 });
		return res.json(users);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch users' });
	}
};

const getUserById = async (req, res) => {
	try {
		const user = await User.findById(req.params.id);
		if (!user) {
			return res.status(404).json({ message: 'User not found' });
		}
		if (req.user?._id && String(user._id) !== String(req.user._id)) {
			return res.status(403).json({ message: 'Forbidden' });
		}
		user.password = undefined;
		return res.json(user);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch user' });
	}
};

const bcrypt = require('bcryptjs');

const createUser = async (req, res) => {
	try {
		const payload = { ...req.body };
		if (payload.password) {
			const salt = await bcrypt.genSalt(10);
			payload.password = await bcrypt.hash(payload.password, salt);
		}
		const user = await User.create(payload);
		const safe = user.toObject();
		delete safe.password;
		return res.status(201).json(safe);
	} catch (error) {
		return res.status(400).json({ message: error.message });
	}
};

const updateUser = async (req, res) => {
	try {
		if (req.user?._id && String(req.params.id) !== String(req.user._id)) {
			return res.status(403).json({ message: 'Forbidden' });
		}

		const payload = { ...req.body };
		if (Object.prototype.hasOwnProperty.call(payload, 'weight')) {
			const rawWeight = payload.weight;
			if (rawWeight === '' || rawWeight === undefined || rawWeight === null) payload.weight = null;
			else payload.weight = Number(rawWeight);
		}
		if (Object.prototype.hasOwnProperty.call(payload, 'targetCalories')) {
			const rawTarget = payload.targetCalories;
			if (rawTarget === '' || rawTarget === undefined || rawTarget === null) payload.targetCalories = null;
			else payload.targetCalories = Number(rawTarget);
		}

		const user = await User.findByIdAndUpdate(req.params.id, payload, {
			new: true,
			runValidators: true,
		});
		if (!user) {
			return res.status(404).json({ message: 'User not found' });
		}
		user.password = undefined;
		return res.json(user);
	} catch (error) {
		return res.status(400).json({ message: error.message });
	}
};

const deleteUser = async (req, res) => {
	try {
		const user = await User.findByIdAndDelete(req.params.id);
		if (!user) {
			return res.status(404).json({ message: 'User not found' });
		}
		return res.json({ message: 'User deleted successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to delete user' });
	}
};

module.exports = {
	getUsers,
	getUserById,
	createUser,
	updateUser,
	deleteUser,
};
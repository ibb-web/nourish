const Progress = require('../models/Progress');

const defaultWeeklyProgress = [
	{ day: 'Mon', calories: 1850, target: 2000 },
	{ day: 'Tue', calories: 2100, target: 2000 },
	{ day: 'Wed', calories: 1920, target: 2000 },
	{ day: 'Thu', calories: 1750, target: 2000 },
	{ day: 'Fri', calories: 2050, target: 2000 },
	{ day: 'Sat', calories: 2200, target: 2000 },
	{ day: 'Sun', calories: 1880, target: 2000 },
];

const defaultHabitTemplates = [
	{ name: 'Drink 8 glasses water', streak: 12, today: true },
	{ name: 'Eat 5 servings veggies', streak: 8, today: true },
	{ name: '30 min exercise', streak: 5, today: false },
	{ name: 'Sleep 7+ hours', streak: 15, today: true },
];

const defaultAchievementTemplates = [
	{ id: 'a1', title: '7-Day Streak', description: 'Logged meals 7 days in a row', icon: '🔥', unlocked: true },
	{ id: 'a2', title: 'Hydration Hero', description: 'Hit water goal 5 days', icon: '💧', unlocked: true },
	{ id: 'a3', title: 'Protein Power', description: 'Met protein goal 10 times', icon: '💪', unlocked: true },
	{ id: 'a4', title: 'Meal Planner', description: 'Plan a full week', icon: '📅', unlocked: false },
	{ id: 'a5', title: 'Recipe Explorer', description: 'Try 20 new recipes', icon: '👨‍🍳', unlocked: false },
	{ id: 'a6', title: 'Goal Crusher', description: 'Hit weight goal', icon: '🏆', unlocked: false },
];

function buildDefaultWeightProgress(user) {
	const startingWeight = Number(user?.weight) > 0 ? Number(user.weight) : 78.5;
	return [
		{ week: 'W1', weight: +(startingWeight + 0.7).toFixed(1) },
		{ week: 'W2', weight: +(startingWeight + 0.2).toFixed(1) },
		{ week: 'W3', weight: +(startingWeight - 0.4).toFixed(1) },
		{ week: 'W4', weight: +(startingWeight - 1.0).toFixed(1) },
		{ week: 'W5', weight: +(startingWeight - 1.3).toFixed(1) },
		{ week: 'W6', weight: +(startingWeight - 1.9).toFixed(1) },
		{ week: 'W7', weight: +(startingWeight - 2.5).toFixed(1) },
		{ week: 'W8', weight: +(startingWeight - 3.0).toFixed(1) },
	];
}

async function ensureProgressForUser(user) {
	let progress = await Progress.findOne({ userId: user._id });
	if (progress) return progress;

	progress = await Progress.create({
		userId: user._id,
		water: Number(user.water) || 5,
		weeklyProgress: defaultWeeklyProgress,
		weightProgress: buildDefaultWeightProgress(user),
		habits: defaultHabitTemplates,
		achievements: defaultAchievementTemplates,
		macroSplit: [
			{ name: 'Protein', value: 35, color: 'var(--chart-1)' },
			{ name: 'Carbs', value: 45, color: 'var(--chart-2)' },
			{ name: 'Fat', value: 20, color: 'var(--chart-4)' },
		],
	});
	return progress;
}

function getUserFilter(req) {
	return req.user?._id ? { userId: req.user._id } : {};
}

const getProgress = async (req, res) => {
	try {
		if (req.user) {
			const progress = await ensureProgressForUser(req.user);
			return res.json([progress]);
		}

		const progress = await Progress.find(getUserFilter(req)).sort({ createdAt: -1 });
		return res.json(progress);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch progress' });
	}
};

const getProgressById = async (req, res) => {
	try {
		const item = await Progress.findById(req.params.id);
		if (!item) {
			return res.status(404).json({ message: 'Progress not found' });
		}
		if (req.user?._id && item.userId.toString() !== req.user._id.toString()) {
			return res.status(404).json({ message: 'Progress not found' });
		}
		return res.json(item);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch progress item' });
	}
};

const createProgress = async (req, res) => {
	try {
		const payload = { ...req.body };
		if (req.user?._id) payload.userId = req.user._id;
		const item = await Progress.create(payload);
		return res.status(201).json(item);
	} catch (error) {
		return res.status(400).json({ message: error.message });
	}
};

const updateProgress = async (req, res) => {
	try {
		const existing = await Progress.findById(req.params.id);
		if (!existing) {
			return res.status(404).json({ message: 'Progress not found' });
		}
		if (req.user?._id && existing.userId.toString() !== req.user._id.toString()) {
			return res.status(404).json({ message: 'Progress not found' });
		}
		const item = await Progress.findByIdAndUpdate(req.params.id, req.body, {
			new: true,
			runValidators: true,
		});
		return res.json(item);
	} catch (error) {
		return res.status(400).json({ message: error.message });
	}
};

const deleteProgress = async (req, res) => {
	try {
		const existing = await Progress.findById(req.params.id);
		if (!existing) {
			return res.status(404).json({ message: 'Progress not found' });
		}
		if (req.user?._id && existing.userId.toString() !== req.user._id.toString()) {
			return res.status(404).json({ message: 'Progress not found' });
		}
		await Progress.findByIdAndDelete(req.params.id);
		return res.json({ message: 'Progress deleted successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to delete progress' });
	}
};

module.exports = {
	getProgress,
	getProgressById,
	createProgress,
	updateProgress,
	deleteProgress,
};
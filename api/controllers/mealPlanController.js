const MealPlan = require('../models/MealPlan');
const Recipe = require('../models/Recipe');

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function startOfCurrentWeek() {
	const date = new Date();
	const day = date.getDay();
	const diff = date.getDate() - day + (day === 0 ? -6 : 1);
	const monday = new Date(date.setDate(diff));
	monday.setHours(0, 0, 0, 0);
	return monday;
}

function buildEmptyMealSlots() {
	return { breakfast: [], lunch: [], dinner: [] };
}

function recipePlanId(recipe) {
	return recipe.externalId || String(recipe._id);
}

async function buildDefaultMealPlan(userId) {
	const recipes = await Recipe.find().sort({ createdAt: -1 });
	if (!recipes.length) {
		return MealPlan.create({
			userId,
			weekStart: startOfCurrentWeek(),
			days: weekDays.map((day) => ({ day, meals: buildEmptyMealSlots() })),
		});
	}

	const pickRecipe = (index) => recipes[index % recipes.length];

	const days = weekDays.map((day, dayIndex) => ({
		day,
		meals: {
			breakfast: [{ recipeId: recipePlanId(pickRecipe(dayIndex)), portion: 1 }],
			lunch: [{ recipeId: recipePlanId(pickRecipe(dayIndex + 1)), portion: 1 }],
			dinner: [{ recipeId: recipePlanId(pickRecipe(dayIndex + 2)), portion: 1 }],
		},
	}));

	return MealPlan.create({ userId, weekStart: startOfCurrentWeek(), days });
}

const { buildCsv } = require('../utils/csvHelper');

const getMealPlans = async (req, res) => {
	try {
		const { weekStart, userId, recipeId, filterType, page, limit } = req.query;

		const criteria = {};
		if (weekStart) {
			const start = new Date(weekStart);
			if (!isNaN(start.getTime())) {
				if (filterType === 'month') {
					const end = new Date(start);
					end.setMonth(end.getMonth() + 1);
					criteria.weekStart = { $gte: start, $lt: end };
				} else {
					const end = new Date(start);
					end.setDate(end.getDate() + 7);
					criteria.weekStart = { $gte: start, $lt: end };
				}
			}
		}
		if (userId) criteria.userId = userId;

		if (req.user && !userId) {
			criteria.userId = req.user._id;
		}

		const pageNum = Math.max(Number(page) || 1, 1);
		const lim = Math.min(Math.max(Number(limit) || 20, 1), 100);
		const skip = (pageNum - 1) * lim;
		let mealPlans = await MealPlan.find(criteria).sort({ createdAt: -1 }).skip(skip).limit(lim);

		if (recipeId) {
			mealPlans = mealPlans.filter((mp) => {
				for (const d of mp.days || []) {
					for (const slot of ['breakfast', 'lunch', 'dinner']) {
						const items = (d.meals && d.meals[slot]) || [];
						if (items.some((it) => String(it.recipeId) === String(recipeId))) return true;
					}
				}
				return false;
			});
		}

		// if user requested only their current plan and none exists, build default
		if (req.user && (!mealPlans || mealPlans.length === 0)) {
			const defaultPlan = await buildDefaultMealPlan(req.user._id);
			return res.json([defaultPlan]);
		}

		return res.json(mealPlans);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch meal plans' });
	}
};

const getMealPlanById = async (req, res) => {
	try {
		const mealPlan = await MealPlan.findById(req.params.id);
		if (!mealPlan) {
			return res.status(404).json({ message: 'Meal plan not found' });
		}
		if (req.user && String(mealPlan.userId) !== String(req.user._id)) {
			return res.status(403).json({ message: 'Forbidden' });
		}
		return res.json(mealPlan);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch meal plan' });
	}
};

const createMealPlan = async (req, res) => {
	try {
		const payload = { ...req.body };
		if (req.user) payload.userId = req.user._id;
		const mealPlan = await MealPlan.create(payload);
		return res.status(201).json(mealPlan);
	} catch (error) {
		return res.status(400).json({ message: error.message });
	}
};

const updateMealPlan = async (req, res) => {
	try {
		const existing = await MealPlan.findById(req.params.id);
		if (!existing) {
			return res.status(404).json({ message: 'Meal plan not found' });
		}
		if (req.user && String(existing.userId) !== String(req.user._id)) {
			return res.status(403).json({ message: 'Forbidden' });
		}
		const payload = { ...req.body };
		if (Array.isArray(payload.days)) {
			for (const d of payload.days) {
				for (const slotName of ['breakfast', 'lunch', 'dinner']) {
					const slots = (d.meals && d.meals[slotName]) || [];
					const dedup = [];
					const seen = new Set();
					for (const s of slots) {
						const key = `${String(s.recipeId)}|${String(s.portion || 1)}`;
						if (seen.has(key)) continue;
						seen.add(key);
						dedup.push(s);
					}
					d.meals[slotName] = dedup;
				}
			}
		}

		const mealPlan = await MealPlan.findByIdAndUpdate(req.params.id, payload, {
			new: true,
			runValidators: true,
		});
		return res.json(mealPlan);
	} catch (error) {
		return res.status(400).json({ message: error.message });
	}
};

const deleteMealPlan = async (req, res) => {
	try {
		const existing = await MealPlan.findById(req.params.id);
		if (!existing) {
			return res.status(404).json({ message: 'Meal plan not found' });
		}
		if (req.user && String(existing.userId) !== String(req.user._id)) {
			return res.status(403).json({ message: 'Forbidden' });
		}
		await MealPlan.findByIdAndDelete(req.params.id);
		return res.json({ message: 'Meal plan deleted successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to delete meal plan' });
	}
};

const exportMealPlanCsv = async (req, res) => {
	try {
		const mealPlan = await MealPlan.findById(req.params.id);
		if (!mealPlan) return res.status(404).json({ message: 'Meal plan not found' });
		if (req.user && String(mealPlan.userId) !== String(req.user._id)) return res.status(403).json({ message: 'Forbidden' });

		// gather recipe details
		const recipeIds = new Set();
		for (const d of mealPlan.days || []) {
			for (const slot of ['breakfast', 'lunch', 'dinner']) {
				const items = (d.meals && d.meals[slot]) || [];
				for (const it of items) recipeIds.add(String(it.recipeId));
			}
		}

		const recipesById = {};
		if (recipeIds.size) {
			const ids = Array.from(recipeIds);
			// fetch recipes by externalId or _id
			const found = await Recipe.find({ $or: [{ externalId: { $in: ids } }, { _id: { $in: ids.filter((i) => /^[a-f0-9]{24}$/i.test(i)) } }] });
			for (const r of found) recipesById[r.externalId || String(r._id)] = r;
		}

		const csv = buildCsv(mealPlan, recipesById);
		res.setHeader('Content-Type', 'text/csv');
		res.setHeader('Content-Disposition', `attachment; filename="mealplan-${mealPlan._id}.csv"`);
		return res.send(csv);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to export meal plan' });
	}
};

module.exports = {
	getMealPlans,
	getMealPlanById,
	createMealPlan,
	updateMealPlan,
	deleteMealPlan,
	exportMealPlanCsv,
};
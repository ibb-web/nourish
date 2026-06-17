const GroceryList = require('../models/GroceryList');
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

function emptyCategories() {
	return [
		{ name: 'Breakfast', items: [] },
		{ name: 'Lunch', items: [] },
		{ name: 'Dinner', items: [] },
	];
}

async function buildDefaultGroceryList(userId) {
	const mealPlan = await MealPlan.findOne({ userId }).sort({ createdAt: -1 });
	if (!mealPlan) {
		return GroceryList.create({ userId, weekStart: startOfCurrentWeek(), categories: emptyCategories() });
	}

	const recipes = await Recipe.find();
	const lookup = new Map(recipes.map((recipe) => [recipe._id.toString(), recipe]));
	const categories = [];

	for (const mealType of ['breakfast', 'lunch', 'dinner']) {
		const items = [];
		mealPlan.days.forEach((day) => {
			(day.meals?.[mealType] || []).forEach((slot) => {
				const recipe = lookup.get(String(slot.recipeId));
				if (!recipe) return;
				items.push({
					name: `${day.day} ${recipe.name}`,
					qty: `${slot.portion} serving${slot.portion === 1 ? '' : 's'}`,
					checked: false,
				});
			});
		});

		categories.push({
			name: mealType.charAt(0).toUpperCase() + mealType.slice(1),
			items,
		});
	}

	return GroceryList.create({ userId, weekStart: mealPlan.weekStart || startOfCurrentWeek(), categories });
}

const getGroceryLists = async (req, res) => {
	try {
		if (req.user) {
			let groceryList = await GroceryList.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
			if (!groceryList) groceryList = await buildDefaultGroceryList(req.user._id);
			return res.json([groceryList]);
		}

		const groceryLists = await GroceryList.find().sort({ createdAt: -1 });
		return res.json(groceryLists);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch grocery lists' });
	}
};

const getGroceryListById = async (req, res) => {
	try {
		const groceryList = await GroceryList.findById(req.params.id);
		if (!groceryList) {
			return res.status(404).json({ message: 'Grocery list not found' });
		}
		if (req.user && String(groceryList.userId) !== String(req.user._id)) {
			return res.status(403).json({ message: 'Forbidden' });
		}
		return res.json(groceryList);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch grocery list' });
	}
};

const createGroceryList = async (req, res) => {
	try {
		const payload = { ...req.body };
		if (req.user) payload.userId = req.user._id;
		const groceryList = await GroceryList.create(payload);
		return res.status(201).json(groceryList);
	} catch (error) {
		return res.status(400).json({ message: error.message });
	}
};

const updateGroceryList = async (req, res) => {
	try {
		const existing = await GroceryList.findById(req.params.id);
		if (!existing) {
			return res.status(404).json({ message: 'Grocery list not found' });
		}
		if (req.user && String(existing.userId) !== String(req.user._id)) {
			return res.status(403).json({ message: 'Forbidden' });
		}
		const groceryList = await GroceryList.findByIdAndUpdate(req.params.id, req.body, {
			new: true,
			runValidators: true,
		});
		return res.json(groceryList);
	} catch (error) {
		return res.status(400).json({ message: error.message });
	}
};

const deleteGroceryList = async (req, res) => {
	try {
		const existing = await GroceryList.findById(req.params.id);
		if (!existing) {
			return res.status(404).json({ message: 'Grocery list not found' });
		}
		if (req.user && String(existing.userId) !== String(req.user._id)) {
			return res.status(403).json({ message: 'Forbidden' });
		}
		await GroceryList.findByIdAndDelete(req.params.id);
		return res.json({ message: 'Grocery list deleted successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to delete grocery list' });
	}
};

module.exports = {
	getGroceryLists,
	getGroceryListById,
	createGroceryList,
	updateGroceryList,
	deleteGroceryList,
};
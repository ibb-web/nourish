const Food = require('../models/Food');
const { searchFoods: searchUsdaFoods } = require('../services/usdaFoodService');
const { normalizeUsdaFoods, normalizeManualFood, getEmojiForFood } = require('../services/foodNormalizationService');

function escapeRegex(value) {
	return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildFoodQuery(query) {
	return {
		name: new RegExp(escapeRegex(query), 'i'),
	};
}

async function upsertNormalizedFoods(foods) {
	const savedFoods = [];
	for (const food of foods) {
		if (!food?.externalId && !food?.name) continue;

		let existing = null;
		if (food.externalId) {
			existing = await Food.findOne({ externalId: food.externalId });
		}

		if (!existing && food.name) {
			existing = await Food.findOne({ name: new RegExp(`^${escapeRegex(food.name)}$`, 'i') });
		}

		if (existing) {
			existing.name = food.name || existing.name;
			existing.category = food.category || existing.category;
			existing.calories = food.calories ?? existing.calories;
			existing.serving = food.serving || existing.serving;
			existing.macros = food.macros || existing.macros;
			existing.emoji = food.emoji || existing.emoji || getEmojiForFood(food.name, food.category);
			existing.source = food.source || existing.source;
			existing.verified = food.verified ?? existing.verified;
			if (!existing.externalId && food.externalId) {
				existing.externalId = food.externalId;
			}
			const saved = await existing.save();
			savedFoods.push(saved);
			continue;
		}

		try {
			const created = await Food.create({
				...food,
				emoji: food.emoji || getEmojiForFood(food.name, food.category),
			});
			savedFoods.push(created);
		} catch (error) {
			if (error?.code !== 11000 || !food.name) throw error;

			// Legacy DBs may still have a unique index on `name`.
			const byName = await Food.findOne({ name: new RegExp(`^${escapeRegex(food.name)}$`, 'i') });
			if (!byName) throw error;

			byName.category = food.category || byName.category;
			byName.calories = food.calories ?? byName.calories;
			byName.serving = food.serving || byName.serving;
			byName.macros = food.macros || byName.macros;
			byName.emoji = food.emoji || byName.emoji || getEmojiForFood(food.name, food.category);
			byName.source = food.source || byName.source;
			byName.verified = food.verified ?? byName.verified;
			if (!byName.externalId && food.externalId) {
				byName.externalId = food.externalId;
			}
			const recovered = await byName.save();
			savedFoods.push(recovered);
		}
	}
	return savedFoods;
}

function withEmoji(foodDoc) {
	const plain = typeof foodDoc?.toObject === 'function' ? foodDoc.toObject() : foodDoc;
	if (!plain) return plain;
	return {
		...plain,
		emoji: plain.emoji || getEmojiForFood(plain.name, plain.category),
	};
}

const getFoods = async (req, res) => {
	try {
		const foods = await Food.find().sort({ name: 1 });
		return res.json(foods.map(withEmoji));
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch foods' });
	}
};

const searchFoods = async (req, res) => {
	try {
		const query = String(req.query.q || '').trim();
		if (!query) {
			return getFoods(req, res);
		}

		const cachedFoods = await Food.find(buildFoodQuery(query)).sort({ name: 1 }).limit(25);
		if (cachedFoods.length) {
			return res.json(cachedFoods.map(withEmoji));
		}

		const usdaFoods = await searchUsdaFoods(query, 12);
		const normalizedFoods = normalizeUsdaFoods(usdaFoods);
		const savedFoods = await upsertNormalizedFoods(normalizedFoods);
		return res.json(savedFoods.map(withEmoji));
	} catch (error) {
		return res.status(error.status || 500).json({ message: error.message || 'Failed to search foods' });
	}
};

const getFoodById = async (req, res) => {
	try {
		const food = await Food.findById(req.params.id);
		if (!food) {
			return res.status(404).json({ message: 'Food not found' });
		}
		return res.json(withEmoji(food));
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch food' });
	}
};

const createFood = async (req, res) => {
	try {
		if (!req.user) {
			return res.status(401).json({ message: 'Unauthorized' });
		}

		const food = await Food.create({
			...normalizeManualFood(req.body),
			source: 'manual',
			verified: Boolean(req.body?.verified),
		});
		return res.status(201).json(food);
	} catch (error) {
		return res.status(400).json({ message: error.message });
	}
};

const updateFood = async (req, res) => {
	try {
		if (!req.user) {
			return res.status(401).json({ message: 'Unauthorized' });
		}

		const existingFood = await Food.findById(req.params.id);
		if (!existingFood) {
			return res.status(404).json({ message: 'Food not found' });
		}

		const mergedPayload = normalizeManualFood({
			...existingFood.toObject(),
			...req.body,
		});

		mergedPayload.source = req.body?.source === 'manual' ? 'manual' : existingFood.source;
		mergedPayload.verified = req.body?.verified != null ? Boolean(req.body.verified) : existingFood.verified;
		if (req.body?.externalId != null) {
			mergedPayload.externalId = String(req.body.externalId);
		}

		const food = await Food.findByIdAndUpdate(
			req.params.id,
			mergedPayload,
			{
				new: true,
				runValidators: true,
				context: 'query',
			},
		);
		if (!food) {
			return res.status(404).json({ message: 'Food not found' });
		}
		return res.json(food);
	} catch (error) {
		return res.status(400).json({ message: error.message });
	}
};

const deleteFood = async (req, res) => {
	try {
		if (!req.user) {
			return res.status(401).json({ message: 'Unauthorized' });
		}

		const food = await Food.findByIdAndDelete(req.params.id);
		if (!food) {
			return res.status(404).json({ message: 'Food not found' });
		}
		return res.json({ message: 'Food deleted successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to delete food' });
	}
};

module.exports = {
	getFoods,
	searchFoods,
	getFoodById,
	createFood,
	updateFood,
	deleteFood,
};
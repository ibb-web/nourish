function toNumber(value, fallback = 0) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
}

function parseFraction(input) {
	if (!input) return null;
	if (typeof input === 'number') return input;
	const text = String(input).trim();
	if (!text) return null;
	if (text.includes('/')) {
		const [numerator, denominator] = text.split('/').map(Number);
		if (Number.isFinite(numerator) && Number.isFinite(denominator) && denominator !== 0) {
			return numerator / denominator;
		}
	}
	const parsed = Number(text);
	return Number.isFinite(parsed) ? parsed : null;
}

function roundValue(value) {
	return Math.round(toNumber(value, 0) * 10) / 10;
}

function extractNutrient(food, nutrientIds = [], nameHints = []) {
	const nutrients = Array.isArray(food?.foodNutrients) ? food.foodNutrients : [];
	const byId = nutrients.find((nutrient) => nutrientIds.includes(Number(nutrient?.nutrientId)));
	if (byId && byId.value != null) return byId.value;

	const hintList = nameHints.map((name) => String(name).toLowerCase());
	const byName = nutrients.find((nutrient) => {
		const nutrientName = String(nutrient?.nutrientName || nutrient?.name || '').toLowerCase();
		return hintList.some((hint) => nutrientName.includes(hint));
	});

	return byName && byName.value != null ? byName.value : null;
}

function cleanUnit(unit) {
	return String(unit || '').replace(/\(s\)$/i, '').trim() || 'g';
}

function extractServing(food) {
	if (food?.servingSize != null) {
		return {
			amount: roundValue(food.servingSize),
			unit: cleanUnit(food.servingSizeUnit || 'g'),
		};
	}

	const servingText = String(food?.householdServingFullText || '').trim();
	const match = servingText.match(/^([\d.\/]+)\s*(.+)?$/);
	if (match) {
		return {
			amount: roundValue(parseFraction(match[1]) ?? 1),
			unit: cleanUnit(match[2] || 'g'),
		};
	}

	return {
		amount: 100,
		unit: 'g',
	};
}

function getEmojiForFood(name, category) {
	const text = `${name || ''} ${category || ''}`.toLowerCase();
	if (/(fish|salmon|tuna|cod|shrimp|seafood|crab|sardine)/.test(text)) return '🐟';
	if (/(beef|pork|chicken|turkey|lamb|meat)/.test(text)) return '🥩';
	if (/(fruit|apple|banana|berry|orange|grape|mango|peach|pear)/.test(text)) return '🍎';
	if (/(vegetable|veg|broccoli|carrot|spinach|lettuce|kale|pepper|tomato)/.test(text)) return '🥦';
	if (/(milk|cheese|yogurt|dairy)/.test(text)) return '🥛';
	if (/(grain|rice|bread|pasta|oat|cereal|wheat)/.test(text)) return '🍞';
	if (/(nut|almond|walnut|peanut|seed)/.test(text)) return '🥜';
	return '🍽️';
}

function normalizeUsdaFood(food) {
	if (!food) return null;

	const name = String(food.description || food.lowercaseDescription || food.brandName || food.foodName || '').trim();
	if (!name) return null;

	const category = String(food.foodCategory || food.dataType || 'General').trim();
	const calories = roundValue(extractNutrient(food, [1008], ['energy', 'calories'])) || 0;
	const protein = roundValue(extractNutrient(food, [1003], ['protein']));
	const carbs = roundValue(extractNutrient(food, [1005], ['carbohydrate', 'carbs', 'carbohydrates']));
	const fat = roundValue(extractNutrient(food, [1004], ['total lipid', 'fat']));
	const serving = extractServing(food);
	const externalId = food.fdcId != null ? String(food.fdcId) : null;

	return {
		name,
		category,
		calories,
		serving,
		macros: {
			protein,
			carbs,
			fat,
		},
		emoji: getEmojiForFood(name, category),
		source: 'api',
		externalId,
		verified: true,
	};
}

function normalizeUsdaFoods(foodList) {
	return Array.isArray(foodList) ? foodList.map(normalizeUsdaFood).filter(Boolean) : [];
}

function normalizeManualFood(payload = {}) {
	const servingInput = payload.serving;
	const serving =
		typeof servingInput === 'string'
			? { amount: 100, unit: cleanUnit(servingInput) }
			: {
				amount: toNumber(servingInput?.amount, 100),
				unit: cleanUnit(servingInput?.unit),
			};

	return {
		name: String(payload.name || '').trim(),
		category: String(payload.category || 'General').trim(),
		calories: toNumber(payload.calories, 0),
		serving,
		macros: {
			protein: toNumber(payload.macros?.protein, 0),
			carbs: toNumber(payload.macros?.carbs, 0),
			fat: toNumber(payload.macros?.fat, 0),
		},
		emoji: String(payload.emoji || '🍽️').trim() || '🍽️',
		source: payload.source === 'manual' ? 'manual' : 'api',
		externalId: payload.externalId ? String(payload.externalId) : undefined,
		verified: Boolean(payload.verified),
	};
}

module.exports = {
	getEmojiForFood,
	normalizeUsdaFood,
	normalizeUsdaFoods,
	normalizeManualFood,
};
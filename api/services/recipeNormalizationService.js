function cleanHtml(text) {
	return String(text || '')
		.replace(/<[^>]+>/g, ' ')
		.replace(/&nbsp;/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function toNumber(value, fallback = 0) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
}

function roundValue(value) {
	return Math.round(toNumber(value, 0) * 10) / 10;
}

function getRecipeEmoji(name, tags = []) {
	const text = `${name || ''} ${Array.isArray(tags) ? tags.join(' ') : ''}`.toLowerCase();
	if (/(salad|veggie|vegetable|greens)/.test(text)) return '🥗';
	if (/(chicken|turkey|beef|steak|pork|lamb)/.test(text)) return '🥩';
	if (/(fish|salmon|tuna|cod|shrimp|seafood)/.test(text)) return '🐟';
	if (/(pasta|noodle|spaghetti|macaroni)/.test(text)) return '🍝';
	if (/(soup|stew|chili)/.test(text)) return '🍲';
	if (/(rice|grain|quinoa|bowl)/.test(text)) return '🍚';
	if (/(bread|toast|sandwich|burger|wrap)/.test(text)) return '🥪';
	if (/(egg|omelet|omelette)/.test(text)) return '🍳';
	if (/(dessert|cake|cookie|pie|brownie|sweet)/.test(text)) return '🍰';
	return '🍽️';
}

function getMacros(nutrition) {
	const nutrients = Array.isArray(nutrition?.nutrients) ? nutrition.nutrients : [];
	const findByName = (name) => nutrients.find((entry) => String(entry?.name || '').toLowerCase() === name);
	return {
		protein: roundValue(findByName('protein')?.amount ?? 0),
		carbs: roundValue(findByName('carbohydrates')?.amount ?? 0),
		fat: roundValue(findByName('fat')?.amount ?? 0),
	};
}

function getCalories(nutrition) {
	const nutrients = Array.isArray(nutrition?.nutrients) ? nutrition.nutrients : [];
	const calories = nutrients.find((entry) => String(entry?.name || '').toLowerCase() === 'calories');
	return roundValue(calories?.amount ?? 0);
}

function getIngredients(recipe) {
	const ingredients = Array.isArray(recipe?.extendedIngredients)
		? recipe.extendedIngredients
		: Array.isArray(recipe?.nutrition?.ingredients)
			? recipe.nutrition.ingredients
			: [];

	return ingredients.map((ingredient) => {
		const amount = ingredient?.measures?.us?.amount || ingredient?.amount || 0;
		const unit = ingredient?.measures?.us?.unitShort || ingredient?.unit || ingredient?.unitShort || '';
		return {
			food: String(ingredient?.nameClean || ingredient?.originalName || ingredient?.name || '').trim(),
			amount: unit ? `${roundValue(amount)} ${unit}`.trim() : String(ingredient?.original || ingredient?.name || '').trim(),
		};
	}).filter((item) => item.food);
}

function getSteps(recipe) {
	const instructions = Array.isArray(recipe?.analyzedInstructions) ? recipe.analyzedInstructions : [];
	const steps = instructions.flatMap((section) => Array.isArray(section?.steps) ? section.steps : []);
	if (steps.length) {
		return steps.map((step) => cleanHtml(step?.step)).filter(Boolean);
	}

	if (recipe?.instructions) {
		return cleanHtml(recipe.instructions)
			.split(/\.(?=\s|$)/)
			.map((step) => step.trim())
			.filter(Boolean);
	}

	return [];
}

function getTags(recipe) {
	return Array.from(new Set([
		...(recipe?.dishTypes || []),
		...(recipe?.diets || []),
		...(recipe?.cuisines || []),
		...(recipe?.occasions || []),
	].map((value) => String(value).trim()).filter(Boolean)));
}

function getDifficulty(recipe) {
	const minutes = toNumber(recipe?.readyInMinutes ?? recipe?.cookingMinutes ?? recipe?.preparationMinutes, 0);
	if (minutes <= 20) return 'Easy';
	if (minutes <= 45) return 'Medium';
	return 'Hard';
}

function normalizeRecipe(recipe, mode = 'detail') {
	if (!recipe) return null;

	const externalId = String(recipe.id ?? recipe.externalId ?? '').trim();
	if (!externalId) return null;

	const tags = getTags(recipe);
	const cuisines = Array.isArray(recipe?.cuisines) ? recipe.cuisines.map((c) => String(c).trim()).filter(Boolean) : [];
	const diets = Array.isArray(recipe?.diets) ? recipe.diets.map((d) => String(d).trim()).filter(Boolean) : [];
	const nutrition = recipe?.nutrition || {};
	const calories = getCalories(nutrition);
	const macros = getMacros(nutrition);
	const name = String(recipe.title || recipe.name || '').trim();
	const description = cleanHtml(recipe.summary || recipe.description || recipe.shortTitle || name);
	const preparationMinutes = toNumber(recipe?.preparationMinutes ?? recipe?.prepTime ?? 0, 0) || undefined;
	const cookingMinutes = toNumber(recipe?.cookingMinutes ?? recipe?.cookTime ?? 0, 0) || undefined;

	return {
		externalId,
		name,
		description: description || name,
		image: String(recipe.image || '').trim(),
		sourceUrl: String(recipe.sourceUrl || '').trim(),
		time: Math.max(1, toNumber(recipe.readyInMinutes ?? recipe.cookingMinutes ?? recipe.preparationMinutes, 1)),
		preparationTime: preparationMinutes,
		cookingTime: cookingMinutes,
		cuisines,
		diets,
		servings: Math.max(1, toNumber(recipe.servings, 1)),
		calories,
		difficulty: getDifficulty(recipe),
		tags,
		emoji: recipe.emoji || getRecipeEmoji(name, tags),
		ingredients: getIngredients(recipe),
		steps: mode === 'summary' ? [] : getSteps(recipe),
		macros,
		lastFetchedAt: new Date(),
	};
}

function normalizeRecipeList(recipes) {
	return Array.isArray(recipes) ? recipes.map((recipe) => normalizeRecipe(recipe, 'summary')).filter(Boolean) : [];
}

module.exports = {
	normalizeRecipe,
	normalizeRecipeList,
	getRecipeEmoji,
};
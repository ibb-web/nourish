const Recipe = require('../models/Recipe');
const spoonacularService = require('../services/spoonacularService');
const recipeNormalization = require('../services/recipeNormalizationService');
const { isCacheStale } = require('../utils/cacheHelper');

const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function isFresh(recipe) {
  if (!recipe?.lastFetchedAt) return false;
  return Date.now() - new Date(recipe.lastFetchedAt).getTime() < CACHE_TTL_MS;
}

function recipeWithEmoji(recipeDoc) {
  const plain = typeof recipeDoc?.toObject === 'function' ? recipeDoc.toObject() : recipeDoc;
  if (!plain) return plain;
  return {
    ...plain,
    emoji: plain.emoji || recipeNormalization.getRecipeEmoji(plain.name, plain.tags),
  };
}

async function upsertRecipe(normalizedRecipe) {
  if (!normalizedRecipe?.externalId) return null;
  const saved = await Recipe.findOneAndUpdate(
    { externalId: normalizedRecipe.externalId },
    { $set: { ...normalizedRecipe, lastFetchedAt: new Date() } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
  return recipeWithEmoji(saved);
}

async function searchCachedRecipes(query, filters = {}) {
  const limit = Number(filters.limit) > 0 ? Number(filters.limit) : 20;
  const offset = Number(filters.offset) >= 0 ? Number(filters.offset) : 0;
  const criteria = {};
  if (query) criteria.name = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const tagFilters = [];
  if (filters.diet) tagFilters.push(new RegExp(filters.diet, 'i'));
  if (filters.cuisine) tagFilters.push(new RegExp(filters.cuisine, 'i'));
  if (tagFilters.length) criteria.tags = { $all: tagFilters };
  if (filters.maxCalories) criteria.calories = { $lte: Number(filters.maxCalories) };
  return Recipe.find(criteria).sort({ lastFetchedAt: -1, updatedAt: -1 }).skip(offset).limit(limit);
}

async function getCachedSuggestions(query, limit = 8) {
  if (!query) return [];
  const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const docs = await Recipe.find({ name: regex })
    .select({ _id: 1, externalId: 1, name: 1, tags: 1, emoji: 1 })
    .sort({ updatedAt: -1 })
    .limit(limit);
  return docs.map((d) => ({
    id: d.externalId || String(d._id),
    name: d.name,
    emoji: d.emoji,
    tags: d.tags || [],
  }));
}

async function refreshRecipeIfNeeded(existingRecipe, recipeId) {
  if (existingRecipe && isFresh(existingRecipe)) {
    return recipeWithEmoji(existingRecipe);
  }

  if (existingRecipe && !existingRecipe.externalId) {
    return recipeWithEmoji(existingRecipe);
  }

  if (!existingRecipe && !recipeId) return null;

  const remote = await spoonacularService.getRecipeInformation(recipeId || existingRecipe.externalId);
  const normalized = recipeNormalization.normalizeRecipe(remote);
  return upsertRecipe(normalized);
}

const searchRecipes = async (req, res) => {
  try {
    const query = String(req.query.q || req.query.query || '').trim();
    const diet = String(req.query.diet || '').trim();
    const cuisine = String(req.query.cuisine || '').trim();
    const maxCalories = req.query.maxCalories ? Number(req.query.maxCalories) : undefined;
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
    const offset = (page - 1) * limit;

    const cachedRecipes = await searchCachedRecipes(query, { diet, cuisine, maxCalories, offset, limit });
    const freshCached = cachedRecipes.filter((recipe) => isFresh(recipe));
    if (freshCached.length && (!query || freshCached.length >= 5)) {
      return res.json(freshCached.map(recipeWithEmoji));
    }

    const spoonacularRecipes = await spoonacularService.searchRecipes({
      query,
      diet: diet || undefined,
      cuisine: cuisine || undefined,
      maxCalories,
      number: limit,
      offset,
    });

    const normalizedRecipes = recipeNormalization.normalizeRecipeList(spoonacularRecipes);
    const savedRecipes = [];
    for (const recipe of normalizedRecipes) {
      const saved = await upsertRecipe(recipe);
      if (saved) savedRecipes.push(saved);
    }
    return res.json(savedRecipes);
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message || 'Failed to search recipes' });
  }
};

const getRecipeSuggestions = async (req, res) => {
  try {
    const query = String(req.query.q || '').trim();
    const limit = Math.min(Math.max(Number(req.query.limit) || 8, 1), 20);
    const suggestions = await getCachedSuggestions(query, limit);
    return res.json(suggestions);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch recipe suggestions' });
  }
};

const getRecipeById = async (req, res) => {
  try {
    const { id } = req.params;
    let recipe = await Recipe.findOne({ externalId: String(id) });
    if (!recipe && /^[a-f0-9]{24}$/i.test(String(id))) {
      recipe = await Recipe.findById(id);
    }

    const refreshed = await refreshRecipeIfNeeded(recipe, id);
    if (refreshed) {
      return res.json(refreshed);
    }

    return res.status(404).json({ message: 'Recipe not found' });
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message || 'Failed to fetch recipe' });
  }
};

const getRecipes = async (req, res) => {
  try {
    const recipes = await Recipe.find().sort({ createdAt: -1 });
    return res.json(recipes.map(recipeWithEmoji));
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch recipes' });
  }
};

const getRandomRecipe = async (req, res) => {
  try {
    const remote = await spoonacularService.getRandomRecipe();
    if (!remote) return res.status(404).json({ message: 'No random recipe returned' });
    const normalized = recipeNormalization.normalizeRecipe(remote);
    const saved = await upsertRecipe(normalized);
    return res.json(saved);
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message || 'Failed to fetch random recipe' });
  }
};

const createRecipe = async (req, res) => {
  try {
    const recipe = await Recipe.create(req.body);
    return res.status(201).json(recipe);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const updateRecipe = async (req, res) => {
  try {
    const recipe = await Recipe.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }
    return res.json(recipe);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const deleteRecipe = async (req, res) => {
  try {
    const recipe = await Recipe.findByIdAndDelete(req.params.id);
    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }
    return res.json({ message: 'Recipe deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete recipe' });
  }
};

module.exports = {
  getRecipes,
  searchRecipes,
  getRecipeSuggestions,
  getRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  getRandomRecipe,
};

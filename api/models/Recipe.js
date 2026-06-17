const mongoose = require('mongoose');

const macroSchema = new mongoose.Schema(
	{
		protein: { type: Number, default: 0, min: 0 },
		carbs: { type: Number, default: 0, min: 0 },
		fat: { type: Number, default: 0, min: 0 },
	},
	{ _id: false },
);

const ingredientSchema = new mongoose.Schema(
	{
		food: { type: String, required: true, trim: true },
		amount: { type: String, required: true, trim: true },
	},
	{ _id: false },
);

const recipeSchema = new mongoose.Schema(
	{
		externalId: { type: String, required: true, unique: true, index: true, trim: true },
		name: { type: String, required: true, trim: true, index: true },
		description: { type: String, required: true, trim: true },
		image: { type: String, default: '' },
		sourceUrl: { type: String, default: '' },
		time: { type: Number, required: true, min: 1 },
		preparationTime: { type: Number, default: null, min: 0 },
		cookingTime: { type: Number, default: null, min: 0 },
		servings: { type: Number, required: true, min: 1 },
		calories: { type: Number, required: true, min: 0 },
		difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Easy' },
		tags: [{ type: String, trim: true }],
		emoji: { type: String, default: '🍽️' },
		ingredients: { type: [ingredientSchema], default: [] },
		steps: [{ type: String, trim: true }],
		macros: { type: macroSchema, default: () => ({}) },
		cuisines: { type: [String], default: [] },
		diets: { type: [String], default: [] },
		lastFetchedAt: { type: Date, default: Date.now },
	},
	{ timestamps: true },
);

// text index for search and index for freshness queries
recipeSchema.index({ name: 'text', tags: 'text' });
recipeSchema.index({ lastFetchedAt: -1 });

module.exports = mongoose.model('Recipe', recipeSchema);
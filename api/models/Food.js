const mongoose = require('mongoose');

const servingSchema = new mongoose.Schema(
	{
		amount: { type: Number, min: 0 },
		unit: { type: String, trim: true },
	},
	{ _id: false },
);

const macroSchema = new mongoose.Schema(
	{
		protein: { type: Number, default: 0, min: 0 },
		carbs: { type: Number, default: 0, min: 0 },
		fat: { type: Number, default: 0, min: 0 },
	},
	{ _id: false },
);

const foodSchema = new mongoose.Schema(
	{
		name: { type: String, required: true, trim: true, index: true },
		category: { type: String, required: true },
		calories: { type: Number, required: true },
		serving: { type: servingSchema, default: {} },
		macros: { type: macroSchema, default: () => ({}) },
		emoji: { type: String, default: '🍽️' },
		source: { type: String, enum: ['manual', 'api'], default: 'api' },
		externalId: { type: String, unique: true, sparse: true },
		verified: { type: Boolean, default: false },
	},
	{ timestamps: true },
);

module.exports = mongoose.model('Food', foodSchema);
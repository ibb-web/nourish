const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema(
	{
		recipeId: { type: String, required: true, trim: true },
		portion: { type: Number, required: true, min: 0.5, max: 4, default: 1 },
	},
	{ _id: false },
);

const dayPlanSchema = new mongoose.Schema(
	{
		day: { type: String, required: true, trim: true },
		meals: {
			breakfast: { type: [slotSchema], default: [] },
			lunch: { type: [slotSchema], default: [] },
			dinner: { type: [slotSchema], default: [] },
		},
	},
	{ _id: false },
);

const mealPlanSchema = new mongoose.Schema(
	{
		userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
		weekStart: { type: Date, required: true },
		days: { type: [dayPlanSchema], default: [] },
	},
	{ timestamps: true },
);

mealPlanSchema.index({ userId: 1, weekStart: -1 });

module.exports = mongoose.model('MealPlan', mealPlanSchema);
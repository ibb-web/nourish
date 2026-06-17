const mongoose = require('mongoose');

const weeklyProgressSchema = new mongoose.Schema(
	{
		day: { type: String, required: true, trim: true },
		calories: { type: Number, required: true, min: 0 },
		target: { type: Number, required: true, min: 0 },
	},
	{ _id: false },
);

const weightProgressSchema = new mongoose.Schema(
	{
		week: { type: String, required: true, trim: true },
		weight: { type: Number, required: true, min: 0 },
		timestamp: { type: Date, default: Date.now },
	},
	{ _id: false },
);

const dailyHabitLogSchema = new mongoose.Schema(
	{
		date: { type: Date, required: true },
		habitType: {
			type: String,
			required: true,
			enum: ['water', 'exercise', 'sleep', 'meal_adherence'],
		},
		status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
		completionPercentage: { type: Number, min: 0, max: 100, default: 0 },
	},
	{ _id: false },
);

const habitSchema = new mongoose.Schema(
	{
		name: { type: String, required: true, trim: true },
		streak: { type: Number, required: true, min: 0 },
		today: { type: Boolean, default: false },
	},
	{ _id: false },
);

const achievementSchema = new mongoose.Schema(
	{
		id: { type: String, required: true, trim: true },
		title: { type: String, required: true, trim: true },
		description: { type: String, required: true, trim: true },
		icon: { type: String, default: '' },
		unlocked: { type: Boolean, default: false },
	},
	{ _id: false },
);

const progressSchema = new mongoose.Schema(
	{
		userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
		water: { type: Number, min: 0, default: 0 },
		weeklyProgress: { type: [weeklyProgressSchema], default: [] },
		weightProgress: { type: [weightProgressSchema], default: [] },
		dailyHabitLogs: { type: [dailyHabitLogSchema], default: [] },
		habits: { type: [habitSchema], default: [] },
		achievements: { type: [achievementSchema], default: [] },
		macroSplit: {
			type: [
				new mongoose.Schema(
					{
						name: { type: String, required: true, trim: true },
						value: { type: Number, required: true, min: 0 },
						color: { type: String, default: '' },
					},
					{ _id: false },
				),
			],
			default: [],
		},
	},
	{ timestamps: true },
);

module.exports = mongoose.model('Progress', progressSchema);
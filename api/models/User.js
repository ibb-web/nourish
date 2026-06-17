const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
	{
		name: { type: String, required: true, trim: true },
		email: { type: String, required: true, unique: true, lowercase: true, trim: true },
		password: { type: String, required: true, minlength: 6 },
		avatar: { type: String, default: '' },
		theme: { type: String, enum: ['light', 'dark'], default: 'light' },
		goal: { type: String, enum: ['lose', 'maintain', 'gain', 'health'], default: 'maintain' },
		diet: { type: String, default: 'balanced' },
		allergies: [{ type: String, trim: true }],
		weight: { type: Number, min: 0 },
		height: { type: Number, min: 0 },
		activity: { type: String, default: 'moderate' },
		mealsPerDay: { type: Number, min: 1, max: 6, default: 3 },
		favorites: [{ type: String }],
		bookmarks: [{ type: String }],
		water: { type: Number, min: 0, default: 0 },
		notifications: {
			meal: { type: Boolean, default: true },
			water: { type: Boolean, default: true },
			weekly: { type: Boolean, default: false },
			promo: { type: Boolean, default: false },
		},
		subscriptionTier: { type: String, enum: ['Starter', 'Plus', 'Pro'], default: 'Starter' },
		onboardingCompleted: { type: Boolean, default: false },
			resetPasswordToken: { type: String },
			resetPasswordExpires: { type: Date },
	},
	{ timestamps: true },
);

module.exports = mongoose.model('User', userSchema);
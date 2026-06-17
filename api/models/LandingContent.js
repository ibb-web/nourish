const mongoose = require('mongoose');

const iconContentSchema = new mongoose.Schema(
	{
		icon: { type: String, required: true, trim: true },
		title: { type: String, required: true, trim: true },
		desc: { type: String, required: true, trim: true },
	},
	{ _id: false },
);

const previewStatSchema = new mongoose.Schema(
	{
		label: { type: String, required: true, trim: true },
		value: { type: String, required: true, trim: true },
		goal: { type: String, required: true, trim: true },
		color: { type: String, required: true, trim: true },
	},
	{ _id: false },
);

const previewMealSchema = new mongoose.Schema(
	{
		meal: { type: String, required: true, trim: true },
		item: { type: String, required: true, trim: true },
		kcal: { type: Number, required: true, min: 0 },
		emoji: { type: String, default: '' },
	},
	{ _id: false },
);

const testimonialSchema = new mongoose.Schema(
	{
		name: { type: String, required: true, trim: true },
		role: { type: String, required: true, trim: true },
		avatar: { type: String, default: '' },
		quote: { type: String, required: true, trim: true },
	},
	{ _id: false },
);

const pricingFeatureSchema = new mongoose.Schema(
	{
		name: { type: String, required: true, trim: true },
	},
	{ _id: false },
);

const pricingTierSchema = new mongoose.Schema(
	{
		name: { type: String, required: true, trim: true },
		price: { type: Number, required: true, min: 0 },
		period: { type: String, required: true, trim: true },
		features: { type: [String], default: [] },
		cta: { type: String, required: true, trim: true },
		popular: { type: Boolean, default: false },
	},
	{ _id: false },
);

const faqSchema = new mongoose.Schema(
	{
		q: { type: String, required: true, trim: true },
		a: { type: String, required: true, trim: true },
	},
	{ _id: false },
);

const landingContentSchema = new mongoose.Schema(
	{
		key: { type: String, required: true, unique: true, default: 'landing' },
		features: { type: [iconContentSchema], default: [] },
		preview: {
			title: { type: String, default: 'Today' },
			greeting: { type: String, default: 'Good morning' },
			status: { type: String, default: 'On track' },
			stats: { type: [previewStatSchema], default: [] },
			meals: { type: [previewMealSchema], default: [] },
			streakLabel: { type: String, default: 'Streak' },
			streakValue: { type: String, default: '🔥 12 days' },
		},
		testimonials: { type: [testimonialSchema], default: [] },
		pricingTiers: { type: [pricingTierSchema], default: [] },
		faqs: { type: [faqSchema], default: [] },
	},
	{ timestamps: true },
);

module.exports = mongoose.model('LandingContent', landingContentSchema);

const LandingContent = require('../models/LandingContent');

const defaultLandingContent = {
	key: 'landing',
	features: [
		{ icon: 'ChefHat', title: 'Personalized Meal Plans', desc: 'Weekly plans tailored to your goals, allergies, and preferences.' },
		{ icon: 'Activity', title: 'Calorie & Macro Tracking', desc: 'Effortless logging with a 100k+ food database.' },
		{ icon: 'Target', title: 'Goal-Based Coaching', desc: 'Whether you cut, bulk, or maintain, we adapt to you.' },
		{ icon: 'BarChart3', title: 'Progress Analytics', desc: 'Beautiful charts for weight, habits, and nutrition trends.' },
		{ icon: 'ShoppingBasket', title: 'Smart Grocery Lists', desc: 'Auto-generated, categorized, and checklist-ready.' },
		{ icon: 'Sparkles', title: "Recipes You'll Love", desc: 'Curated by dietitians, sorted by your tastes.' },
	],
	preview: {
		title: 'Today',
		greeting: 'Good morning',
		status: 'On track',
		stats: [
			{ label: 'Calories', value: '1,420', goal: '/ 2,000', color: 'var(--chart-1)' },
			{ label: 'Protein', value: '92g', goal: '/ 140g', color: 'var(--chart-2)' },
			{ label: 'Water', value: '1.4L', goal: '/ 2.5L', color: 'var(--chart-3)' },
		],
		meals: [
			{ meal: 'Breakfast', item: 'Berry Protein Smoothie', kcal: 290, emoji: '🥤' },
			{ meal: 'Lunch', item: 'Mediterranean Salmon Bowl', kcal: 520, emoji: '🥗' },
			{ meal: 'Snack', item: 'Greek yogurt + almonds', kcal: 240, emoji: '🥛' },
		],
		streakLabel: 'Streak',
		streakValue: '🔥 12 days',
	},
	testimonials: [
		{ name: 'Sarah Chen', role: 'Lost 18 lbs in 3 months', avatar: '👩', quote: 'Finally a nutrition app that adapts to my busy schedule. The meal planner is a game-changer.' },
		{ name: 'Marcus Rivera', role: 'Marathon runner', avatar: '🏃‍♂️', quote: 'The macro tracking is incredibly precise. My recovery has never been better.' },
		{ name: 'Priya Patel', role: 'Plant-based for 2 years', avatar: '👩‍🦱', quote: 'Best app for vegans. Recipe database is huge and grocery lists save me hours every week.' },
	],
	pricingTiers: [
		{ name: 'Starter', price: 0, period: 'forever', features: ['Calorie & macro tracking', 'Basic food database', 'Weekly meal planner', 'Community support'], cta: 'Get Started', popular: false },
		{ name: 'Plus', price: 9, period: 'month', features: ['Everything in Starter', 'Personalized meal plans', 'Full recipe library', 'Grocery list generator', 'Progress analytics', 'Priority support'], cta: 'Start Free Trial', popular: true },
		{ name: 'Pro', price: 19, period: 'month', features: ['Everything in Plus', '1-on-1 nutrition coaching', 'Custom macro targets', 'Advanced biometrics', 'Lab result tracking', 'Family accounts (up to 5)'], cta: 'Go Pro', popular: false },
	],
	faqs: [
		{ q: 'How is my meal plan personalized?', a: 'We tailor every plan to your goals, dietary preferences, allergies, activity level, and food likes. You can adjust anytime.' },
		{ q: 'Can I cancel anytime?', a: 'Yes. Cancel from your account settings, no fees, no questions asked.' },
		{ q: 'Does it support vegetarian, vegan, keto, and other diets?', a: 'Yes, we support 20+ diets including paleo, Mediterranean, low-FODMAP, and more.' },
		{ q: 'Will it sync with my fitness tracker?', a: 'We integrate with Apple Health, Google Fit, Fitbit, Garmin, and Whoop.' },
		{ q: 'Is my data private?', a: 'Always. Your data is encrypted and never sold. You own it.' },
	],
};

async function getLandingContent(req, res) {
	try {
		let content = await LandingContent.findOne({ key: 'landing' });
		if (!content) {
			content = await LandingContent.create(defaultLandingContent);
		}
		return res.json(content);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch landing content' });
	}
}

module.exports = {
	getLandingContent,
};

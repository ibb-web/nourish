const mongoose = require('mongoose');

const groceryItemSchema = new mongoose.Schema(
	{
		name: { type: String, required: true, trim: true },
		qty: { type: String, required: true, trim: true },
		checked: { type: Boolean, default: false },
	},
	{ _id: false },
);

const groceryCategorySchema = new mongoose.Schema(
	{
		name: { type: String, required: true, trim: true },
		items: { type: [groceryItemSchema], default: [] },
	},
	{ _id: false },
);

const groceryListSchema = new mongoose.Schema(
	{
		userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
		weekStart: { type: Date, required: true },
		categories: { type: [groceryCategorySchema], default: [] },
	},
	{ timestamps: true },
);

module.exports = mongoose.model('GroceryList', groceryListSchema);
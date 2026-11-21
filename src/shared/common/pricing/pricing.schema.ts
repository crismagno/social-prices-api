import mongoose from 'mongoose';

export const PricingSchema = new mongoose.Schema(
	{
		cost: Number,
		variableExpensesPercentage: Number,
		fixedExpensesPercentage: Number,
		profitPercentage: Number,
	},
	{ _id: false },
);

import mongoose from 'mongoose';

export const CodeNameSchema = new mongoose.Schema(
	{
		code: String,
		name: String,
	},
	{ _id: false },
);

export const AddressSchema = new mongoose.Schema(
	{
		address1: String,
		address2: { type: String, optional: true },
		city: String,
		isValid: Boolean,
		state: CodeNameSchema,
		uid: String,
		zip: String,
		description: { type: String, optional: true },
		country: CodeNameSchema,
		district: String,
	},
	{ _id: false },
);

import mongoose from 'mongoose';

import AddressEnum from '../enums/address.enum';

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
		types: {
			type: [String],
			enum: {
				values: Object.keys(AddressEnum.Types),
				message: '{VALUE} is not supported',
			},
		},
	},
	{ _id: false },
);

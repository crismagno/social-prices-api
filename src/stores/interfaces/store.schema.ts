import mongoose from 'mongoose';

import { SoftDeleteSchema } from '../../shared/schemas/soft-delete.schema';
import { IStore } from './store.interface';
import StoresEnum from './stores.enum';

const PhoneNumberSchema = new mongoose.Schema(
	{
		uid: String,
		type: {
			type: String,
			enum: {
				values: Object.keys(StoresEnum.PhoneTypes),
				message: '{VALUE} is not supported',
			},
		},
		number: String,
		messengers: {
			type: [String],
			enum: {
				values: Object.keys(StoresEnum.PhoneNumberMessenger),
				message: '{VALUE} is not supported',
			},
		},
	},
	{ _id: false },
);

const CodeNameSchema = new mongoose.Schema(
	{
		code: String,
		name: String,
	},
	{ _id: false },
);

const AddressSchema = new mongoose.Schema(
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

const StoreSchema = new mongoose.Schema<IStore>(
	{
		name: { type: String, required: true },
		email: { type: String, unique: true, required: true },
		logo: { type: String, optional: true },
		about: { type: String, optional: true },
		status: {
			type: String,
			enum: {
				values: Object.keys(StoresEnum.Status),
				message: '{VALUE} is not supported',
			},
			required: true,
		},
		startedAt: { type: Date, required: true },
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		description: { type: String, optional: true },
		phoneNumbers: {
			type: [PhoneNumberSchema],
			optional: true,
		},
		addresses: {
			type: [AddressSchema],
			optional: true,
		},
		softDelete: SoftDeleteSchema,
	},
	{ timestamps: true, collection: 'stores' },
);

export default StoreSchema;

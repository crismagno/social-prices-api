import mongoose from 'mongoose';

import { AddressSchema } from '../../../shared/schemas/address.schema';
import { PhoneNumberSchema } from '../../../shared/schemas/phone-number.schema';
import { SoftDeleteSchema } from '../../../shared/schemas/soft-delete.schema';
import { IStore } from './store.interface';
import StoresEnum from './stores.enum';

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
		categoriesIds: { type: [mongoose.Schema.Types.ObjectId] },
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

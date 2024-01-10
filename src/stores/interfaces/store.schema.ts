import mongoose from 'mongoose';

import StoresEnum from './stores.enum';
import { IStore } from './stores.interface';

const StoreSchema = new mongoose.Schema<IStore>(
	{
		name: { type: String, required: true },
		email: { type: String, unique: true, required: true },
		logo: { type: String, optional: true },
		status: {
			type: String,
			enum: {
				values: Object.keys(StoresEnum.Status),
				message: '{VALUE} is not supported',
			},
			required: true,
		},
		startedAt: { type: Date, required: true },
		userId: { type: String, required: true },
	},
	{ timestamps: true, collection: 'stores' },
);

export default StoreSchema;

import mongoose from 'mongoose';

import { SoftDeleteSchema } from '../../../shared/common/soft-delete/soft-delete.schema';
import { IManager } from './manager.interface';
import ManagersEnum from './managers.enum';

const ManagerSchema = new mongoose.Schema<IManager>(
	{
		name: { type: String, required: true },
		email: { type: String, unique: true, required: true },
		password: { type: String, required: true },
		birthDate: { type: Date, optional: true },
		level: {
			type: String,
			enum: {
				values: Object.keys(ManagersEnum.Level),
				message: '{VALUE} is not supported',
			},
			required: true,
		},
		isActive: { type: Boolean, required: true, default: true },
		isMain: { type: Boolean, required: true, default: false },
		createdByManagerId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Manager',
			optional: true,
		},
		softDelete: {
			type: SoftDeleteSchema,
			optional: true,
		},
	},
	{ timestamps: true, collection: 'managers' },
);

export default ManagerSchema;

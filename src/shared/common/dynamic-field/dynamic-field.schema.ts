import mongoose from 'mongoose';

import DynamicFieldEnum from './dynamic-field.enum';

export const DynamicFieldSchema = new mongoose.Schema(
	{
		name: String,
		type: {
			type: String,
			enum: {
				values: Object.keys(DynamicFieldEnum.Type),
				message: '{VALUE} is not supported',
			},
		},
		value: mongoose.Schema.Types.Mixed,
	},
	{ _id: false },
);

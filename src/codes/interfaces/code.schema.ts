import mongoose from 'mongoose';

import CodesEnum from './codes.enum';

const CodeSchema = new mongoose.Schema(
	{
		userId: { type: String, required: true },
		value: { type: String, required: true },
		type: {
			type: String,
			enum: {
				values: Object.keys(CodesEnum.Type),
				message: '{VALUE} is not supported',
			},
			required: true,
		},
		expiresIn: { type: Date, required: true },
	},
	{ timestamps: true, collection: 'codes' },
);

export default CodeSchema;

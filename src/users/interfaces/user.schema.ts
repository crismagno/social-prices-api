import { randomUUID } from 'crypto';
import mongoose, { Schema } from 'mongoose';

import UsersEnum from './users.enum';

const UserSchema = new mongoose.Schema(
	{
		uid: { type: String, required: true, default: () => randomUUID() },
		username: { type: String, required: true },
		password: { type: String, required: true },
		email: { type: String, unique: true, required: true },
		avatar: { type: String, optional: true },
		authToken: String,
		authProvider: {
			type: String,
			enum: {
				values: Object.keys(UsersEnum.Provider),
				message: '{VALUE} is not supported',
			},
			required: true,
		},
		status: {
			type: String,
			enum: {
				values: Object.keys(UsersEnum.Status),
				message: '{VALUE} is not supported',
			},
			required: true,
		},
		phoneNumbers: [String],
		extraDataProvider: Schema.Types.Mixed,
	},
	{ timestamps: true, collection: 'users' },
);

export default UserSchema;

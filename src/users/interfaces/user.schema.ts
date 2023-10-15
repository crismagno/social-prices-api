import { randomUUID } from 'crypto';
import mongoose, { Schema } from 'mongoose';

import UsersEnum from './users.enum';

// const PhoneNumberSchema = new mongoose.Schema({
// 	type: {
// 		enum: {
// 			values: Object.keys(UsersEnum.PhoneTypes),
// 			message: '{VALUE} is not supported',
// 		},
// 	},
// 	number: String,
// });

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
		phoneNumbers: {
			type: [
				{
					type: String,
					number: String,
				},
			],
			optional: true,
		},
		extraDataProvider: Schema.Types.Mixed,
	},
	{ timestamps: true, collection: 'users' },
);

export default UserSchema;

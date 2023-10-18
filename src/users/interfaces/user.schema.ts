import { randomUUID } from 'crypto';
import mongoose, { Schema } from 'mongoose';

import { IUser } from './user.interface';
import UsersEnum from './users.enum';

const PhoneNumberSchema = new mongoose.Schema({
	type: String,
	number: String,
});

const CodeNameSchema = new mongoose.Schema({
	code: String,
	name: String,
});

const AddressSchema = new mongoose.Schema({
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
});

const UserSchema = new mongoose.Schema<IUser>(
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
			type: [PhoneNumberSchema],
			optional: true,
		},
		extraDataProvider: Schema.Types.Mixed,
		firstName: { type: String, optional: true },
		lastName: { type: String, optional: true },
		middleName: { type: String, optional: true },
		birthDate: { type: Date, optional: true },
		addresses: {
			type: [AddressSchema],
			optional: true,
		},
		gender: {
			type: String,
			enum: {
				values: Object.keys(UsersEnum.Gender),
				message: '{VALUE} is not supported',
			},
			optional: true,
		},
	},
	{ timestamps: true, collection: 'users' },
);

export default UserSchema;

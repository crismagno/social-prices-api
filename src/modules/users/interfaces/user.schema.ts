import { randomUUID } from 'crypto';
import mongoose, { Schema } from 'mongoose';

import { AddressSchema } from '../../../shared/schemas/address.schema';
import { PhoneNumberSchema } from '../../../shared/schemas/phone-number.schema';
import { IUser } from './user.interface';
import UsersEnum from './users.enum';

const UserSchema = new mongoose.Schema<IUser>(
	{
		uid: { type: String, required: true, default: () => randomUUID() },
		username: { type: String, required: true },
		password: { type: String, required: true },
		email: { type: String, unique: true, required: true },
		avatar: { type: String, optional: true },
		about: { type: String, optional: true },
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
		name: { type: String, optional: true },
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
				default: UsersEnum.Gender.OTHER,
			},
			optional: true,
		},
	},
	{ timestamps: true, collection: 'users' },
);

export default UserSchema;

import mongoose from 'mongoose';

import PhoneNumberEnum from '../enums/phone-number.enum';

export const PhoneNumberSchema = new mongoose.Schema(
	{
		uid: String,
		type: {
			type: String,
			enum: {
				values: Object.keys(PhoneNumberEnum.Type),
				message: '{VALUE} is not supported',
			},
		},
		number: String,
		messengers: {
			type: [String],
			enum: {
				values: Object.keys(PhoneNumberEnum.PhoneNumberMessenger),
				message: '{VALUE} is not supported',
			},
		},
	},
	{ _id: false },
);

import mongoose, { Document } from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { IAddress } from '../../../shared/interfaces/address.interface';
import { IPhoneNumber } from '../../../shared/interfaces/phone-number';
import { AddressSchema } from '../../../shared/schemas/address.schema';
import { PhoneNumberSchema } from '../../../shared/schemas/phone-number.schema';
import UsersEnum from '../../users/interfaces/users.enum';
import { ICustomer } from './customer.interface';

@Schema()
export class Customer extends Document implements ICustomer {
	readonly _id: string;

	@Prop({ type: String })
	avatar: string | null;

	@Prop({ type: String })
	email: string | null;

	@Prop({ type: String })
	firstName: string | null;

	@Prop({ type: String })
	lastName: string | null;

	@Prop({ type: String })
	middleName: string | null;

	@Prop({ type: Date })
	birthDate: Date | null;

	@Prop({
		type: String,
		enum: {
			values: Object.keys(UsersEnum.Gender),
			message: '{VALUE} is not supported',
		},
	})
	gender: UsersEnum.Gender | null;

	@Prop({ type: String })
	about: string | null;

	@Prop({ type: [AddressSchema] })
	addresses: IAddress[];

	@Prop({ type: [PhoneNumberSchema] })
	phoneNumbers: IPhoneNumber[];

	@Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
	userId: mongoose.Schema.Types.ObjectId | null;

	@Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: 'User' })
	ownerUserId: mongoose.Schema.Types.ObjectId;

	@Prop({ required: true, type: Date })
	createdAt: Date;

	@Prop({ required: true, type: Date })
	updatedAt: Date;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);

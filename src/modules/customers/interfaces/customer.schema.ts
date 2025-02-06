import mongoose from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import PersonEnum from '../../../shared/enums/person.enum';
import { IAddress } from '../../../shared/interfaces/address.interface';
import { IPhoneNumber } from '../../../shared/interfaces/phone-number.interface';
import { AddressSchema } from '../../../shared/schemas/address.schema';
import { PhoneNumberSchema } from '../../../shared/schemas/phone-number.schema';
import { ICustomer } from './customer.interface';

@Schema()
export class Customer implements ICustomer {
	readonly _id: string;

	@Prop({ type: String })
	avatar: string | null;

	@Prop({ type: String })
	email: string | null;

	@Prop({ type: String })
	name: string | null;

	@Prop({ type: Date })
	birthDate: Date | null;

	@Prop({
		type: String,
		enum: {
			values: Object.keys(PersonEnum.Gender),
			message: '{VALUE} is not supported',
		},
	})
	gender: PersonEnum.Gender | null;

	@Prop({ type: String })
	about: string | null;

	@Prop({ type: [AddressSchema] })
	addresses: IAddress[];

	@Prop({ type: [PhoneNumberSchema] })
	phoneNumbers: IPhoneNumber[];

	@Prop({ type: mongoose.Schema.Types.ObjectId })
	userId: mongoose.Schema.Types.ObjectId | null;

	@Prop({ required: true, type: mongoose.Schema.Types.ObjectId })
	ownerUserId: mongoose.Schema.Types.ObjectId;

	@Prop({ type: [mongoose.Schema.Types.ObjectId] })
	tagsIds: mongoose.Schema.Types.ObjectId[];

	@Prop({ type: String })
	uniqName: string | null;

	@Prop({ required: true, type: Date })
	createdAt: Date;

	@Prop({ required: true, type: Date })
	updatedAt: Date;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);

import mongoose, { Document } from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { IAddress } from '../../../shared/interfaces/address.interface';
import { IPhoneNumber } from '../../../shared/interfaces/phone-number';
import { AddressSchema } from '../../../shared/schemas/address.schema';
import { PhoneNumberSchema } from '../../../shared/schemas/phone-number.schema';
import UsersEnum from '../../users/interfaces/users.enum';
import EmployeeEnum from './employee.enum';
import { IEmployee } from './employee.interface';

@Schema()
export class Employee extends Document implements IEmployee {
	readonly _id: string;

	@Prop({ required: true, type: mongoose.Schema.Types.ObjectId })
	userId: mongoose.Schema.Types.ObjectId;

	@Prop({ type: String })
	avatar: string | null;

	@Prop({ required: true, type: String })
	name: string;

	@Prop({ required: true, type: String })
	email: string;

	@Prop({ required: true, type: String })
	password: string;

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

	@Prop({
		required: true,
		type: String,
		enum: {
			values: Object.keys(EmployeeEnum.Level),
			message: '{VALUE} is not supported',
		},
	})
	level: EmployeeEnum.Level;

	@Prop({ type: String })
	about: string | null;

	@Prop({ type: [AddressSchema] })
	addresses: IAddress[];

	@Prop({ type: [PhoneNumberSchema] })
	phoneNumbers: IPhoneNumber[];

	@Prop({ type: [mongoose.Schema.Types.ObjectId] })
	tagsIds: mongoose.Schema.Types.ObjectId[];

	@Prop({ required: true, type: Date })
	createdAt: Date;

	@Prop({ required: true, type: Date })
	updatedAt: Date;
}

export const EmployeeSchema = SchemaFactory.createForClass(Employee);

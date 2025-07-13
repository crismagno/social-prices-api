import mongoose from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { IAddress } from '../../../shared/common/address/address.interface';
import { AddressSchema } from '../../../shared/common/address/address.schema';
import PersonEnum from '../../../shared/common/person/person.enum';
import { IPhoneNumber } from '../../../shared/common/phone/phone-number.interface';
import { PhoneNumberSchema } from '../../../shared/common/phone/phone-number.schema';
import { IEmployee } from './employee.interface';
import EmployeesEnum from './employees.enum';

@Schema()
export class Employee implements IEmployee {
	readonly _id: string;

	@Prop({ required: true, type: mongoose.Schema.Types.ObjectId })
	userId: mongoose.Schema.Types.ObjectId;

	@Prop({ type: String })
	avatar: string | null;

	@Prop({ required: true, type: String })
	name: string;

	@Prop({ required: true, type: String, unique: true })
	username: string;

	@Prop({ required: true, type: String })
	email: string;

	@Prop({ required: true, type: String })
	password: string;

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

	@Prop({
		required: true,
		type: String,
		enum: {
			values: Object.keys(EmployeesEnum.Level),
			message: '{VALUE} is not supported',
		},
	})
	level: EmployeesEnum.Level;

	@Prop({ type: String })
	about: string | null;

	@Prop({ type: [AddressSchema] })
	addresses: IAddress[];

	@Prop({ type: [PhoneNumberSchema] })
	phoneNumbers: IPhoneNumber[];

	@Prop({ type: [mongoose.Schema.Types.ObjectId] })
	tagsIds: mongoose.Schema.Types.ObjectId[];

	@Prop({
		required: true,
		type: String,
		enum: {
			values: Object.keys(EmployeesEnum.Status),
			message: '{VALUE} is not supported',
		},
	})
	status: EmployeesEnum.Status;

	@Prop({ type: Boolean })
	isMain: boolean;

	@Prop({ type: String })
	uploadFilename: string | null;

	@Prop({ required: true, type: Date })
	createdAt: Date;

	@Prop({ required: true, type: Date })
	updatedAt: Date;
}

export const EmployeeSchema = SchemaFactory.createForClass(Employee);

import mongoose from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import AppsEnum from '../../apps/interfaces/apps.enum';
import { IAddress } from '../../../shared/common/address/address.interface';
import { AddressSchema } from '../../../shared/common/address/address.schema';
import PersonEnum from '../../../shared/common/person/person.enum';
import { IPhoneNumber } from '../../../shared/common/phone/phone-number.interface';
import { PhoneNumberSchema } from '../../../shared/common/phone/phone-number.schema';
import { ICustomer, IExternalSource } from './customer.interface';

const ExternalSourceSchema = new mongoose.Schema(
	{
		appId: { type: String, enum: Object.values(AppsEnum.App) },
		externalId: { type: String },
	},
	{ _id: false },
);

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

	@Prop({ type: String })
	idNumber: string | null;

	@Prop({ type: String })
	cpf: string | null;

	@Prop({ type: String })
	cnpj: string | null;

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

	@Prop({ type: String })
	uploadFilename: string | null;

	@Prop({ type: [ExternalSourceSchema], default: [] })
	externalSources?: IExternalSource[];

	@Prop({ required: true, type: Date })
	createdAt: Date;

	@Prop({ required: true, type: Date })
	updatedAt: Date;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);

CustomerSchema.index({ ownerUserId: 1, createdAt: 1 }); // table list + default sort
CustomerSchema.index({ ownerUserId: 1, uniqName: 1 }); // uniqName lookups
CustomerSchema.index({ ownerUserId: 1, email: 1 }); // duplicate checks by email

// one customer per external contact; partial so the (many) customers without any source are not indexed
CustomerSchema.index(
	{
		ownerUserId: 1,
		'externalSources.appId': 1,
		'externalSources.externalId': 1,
	},
	{
		unique: true,
		partialFilterExpression: {
			'externalSources.externalId': { $type: 'string' },
		},
	},
);

import mongoose from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { IAddress } from '../../../shared/interfaces/address.interface';
import { IPhoneNumber } from '../../../shared/interfaces/phone-number';
import { ISoftDelete } from '../../../shared/interfaces/soft-delete.interface';
import { AddressSchema } from '../../../shared/schemas/address.schema';
import { PhoneNumberSchema } from '../../../shared/schemas/phone-number.schema';
import { SoftDeleteSchema } from '../../../shared/schemas/soft-delete.schema';
import { IStore } from './store.interface';
import StoresEnum from './stores.enum';

@Schema()
export class Store implements IStore {
	readonly _id: string;

	@Prop({ type: String, required: true })
	name: string;

	@Prop({ type: String, required: true, unique: true })
	email: string;

	@Prop({ type: String })
	logo: string | null;

	@Prop({ type: String })
	about: string | null;

	@Prop({
		required: true,
		type: String,
		enum: {
			values: Object.keys(StoresEnum.Status),
			message: '{VALUE} is not supported',
		},
	})
	status: StoresEnum.Status;

	@Prop({ required: true, type: Date })
	startedAt: Date;

	@Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: 'User' })
	userId: mongoose.Schema.Types.ObjectId;

	@Prop({ type: String })
	description: string | null;

	@Prop({ type: [mongoose.Schema.Types.ObjectId] })
	categoriesIds: mongoose.Schema.Types.ObjectId[];

	@Prop({ type: [mongoose.Schema.Types.ObjectId] })
	tagsIds: mongoose.Schema.Types.ObjectId[];

	@Prop({ type: [PhoneNumberSchema] })
	phoneNumbers: IPhoneNumber[];

	@Prop({ type: [AddressSchema] })
	addresses: IAddress[];

	@Prop({ type: SoftDeleteSchema })
	softDelete: ISoftDelete;

	@Prop({ required: true, type: Date })
	createdAt: Date;

	@Prop({ required: true, type: Date })
	updatedAt: Date;
}

export const StoreSchema = SchemaFactory.createForClass(Store);

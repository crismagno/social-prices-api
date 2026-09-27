import mongoose from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { ITransaction } from './transaction.interface';
import TransactionsEnum from './transactions.enum';

@Schema({ timestamps: true, collection: 'transactions' })
export class Transaction implements ITransaction {
	readonly _id: string;

	@Prop({ required: true, type: mongoose.Schema.Types.ObjectId })
	userId: string;

	@Prop({ required: true, type: mongoose.Schema.Types.ObjectId })
	createdByUserId: string;

	@Prop({ type: mongoose.Schema.Types.ObjectId, default: null })
	createdByEmployeeId: string | null;

	@Prop({ required: true, type: String })
	name: string;

	@Prop({
		required: true,
		type: String,
		enum: {
			values: Object.keys(TransactionsEnum.Type),
			message: '{VALUE} is not supported',
		},
	})
	type: TransactionsEnum.Type;

	@Prop({ required: true, type: Number, min: 0 })
	value: number;

	@Prop({
		required: true,
		type: String,
		default: TransactionsEnum.Status.PENDING,
		enum: {
			values: Object.keys(TransactionsEnum.Status),
			message: '{VALUE} is not supported',
		},
	})
	status: TransactionsEnum.Status;

	@Prop({ type: String, default: null })
	note: string | null;

	// Plain strings (not ObjectIds) on purpose: the summary runs through
	// `aggregate`, which does not cast ids, so filters and stored values must
	// already be the same type.
	@Prop({ type: [String], default: [] })
	tagsIds: string[];

	@Prop({ type: [String], default: [] })
	categoriesIds: string[];

	@Prop({ type: [String], default: [] })
	storeIds: string[];

	@Prop({ required: true, type: Date })
	createdDate: Date;

	createdAt: Date;

	updatedAt: Date;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);

TransactionSchema.index({ userId: 1, createdDate: -1 });

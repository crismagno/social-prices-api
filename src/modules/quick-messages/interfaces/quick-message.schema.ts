import mongoose from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { ISoftDelete } from '../../../shared/common/soft-delete/soft-delete.interface';
import { SoftDeleteSchema } from '../../../shared/common/soft-delete/soft-delete.schema';
import { IQuickMessage, IQuickMessageBlock } from './quick-message.interface';
import QuickMessagesEnum from './quick-messages.enum';

// One shape for both block types: the unused fields of a text block stay empty.
const QuickMessageBlockSchema = new mongoose.Schema(
	{
		type: {
			type: String,
			required: true,
			enum: Object.values(QuickMessagesEnum.BlockType),
		},
		text: { type: String },
		kind: { type: String, enum: Object.values(QuickMessagesEnum.MediaKind) },
		fileKey: { type: String },
		fileName: { type: String },
		mimeType: { type: String },
		size: { type: Number },
		caption: { type: String, default: null },
	},
	{ _id: false },
);

@Schema({ timestamps: true, collection: 'quick-messages' })
export class QuickMessage implements IQuickMessage {
	readonly _id: string;

	@Prop({ required: true, type: mongoose.Schema.Types.ObjectId })
	ownerUserId: string;

	@Prop({ required: true, type: String })
	name: string;

	@Prop({ type: [QuickMessageBlockSchema], default: [] })
	blocks: IQuickMessageBlock[];

	@Prop({ type: Boolean, default: true })
	allEmployees: boolean;

	@Prop({ type: [mongoose.Schema.Types.ObjectId], default: [] })
	employeesIds: string[];

	@Prop({ type: Number, default: 0 })
	usageCount: number;

	@Prop({ type: Date, default: null })
	lastUsedAt: Date | null;

	@Prop({ type: mongoose.Schema.Types.ObjectId, default: null })
	createdByEmployeeId: string | null;

	@Prop({ type: mongoose.Schema.Types.ObjectId, default: null })
	updatedByEmployeeId: string | null;

	@Prop({ type: SoftDeleteSchema, default: null })
	softDelete: ISoftDelete | null;

	createdAt: Date;

	updatedAt: Date;
}

export const QuickMessageSchema = SchemaFactory.createForClass(QuickMessage);

QuickMessageSchema.index({ ownerUserId: 1, name: 1 });

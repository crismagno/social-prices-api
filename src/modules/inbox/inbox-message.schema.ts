import mongoose from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import InboxEnum from './interfaces/inbox.enum';
import { IInboxAttachment, IInboxSender } from './interfaces/inbox.types';

@Schema({
	timestamps: { createdAt: true, updatedAt: false },
	collection: 'inbox_messages',
})
export class InboxMessage {
	@Prop({ required: true, type: mongoose.Schema.Types.ObjectId })
	ownerUserId: mongoose.Schema.Types.ObjectId;

	@Prop({ required: true, type: mongoose.Schema.Types.ObjectId })
	conversationId: mongoose.Schema.Types.ObjectId;

	@Prop({
		required: true,
		type: String,
		enum: Object.values(InboxEnum.Channel),
	})
	channel: InboxEnum.Channel;

	@Prop({ required: true, type: String })
	channelMessageId: string;

	@Prop({
		required: true,
		type: String,
		enum: Object.values(InboxEnum.Direction),
	})
	direction: InboxEnum.Direction;

	@Prop({
		required: true,
		type: String,
		enum: Object.values(InboxEnum.MessageKind),
	})
	kind: InboxEnum.MessageKind;

	@Prop({ type: String, default: null })
	text: string | null;

	@Prop({ type: [Object], default: [] })
	attachments: IInboxAttachment[];

	@Prop({ type: Object, default: null })
	sender: IInboxSender | null;

	@Prop({ required: true, type: Date })
	sentAt: Date;

	@Prop({ required: true, type: Date })
	receivedAt: Date;

	@Prop({ type: String, default: null })
	sentByEmployeeId: string | null;

	@Prop({ type: Object, default: () => ({ deliveredAt: null, readAt: null }) })
	status: { deliveredAt: Date | null; readAt: Date | null };

	@Prop({ type: Boolean, default: false })
	isEcho: boolean;

	@Prop({ type: Boolean, default: false })
	isUnsupported: boolean;

	@Prop({ type: Date, default: null })
	deletedAt: Date | null;

	@Prop({ type: Object, default: null })
	channelData: Record<string, unknown> | null;

	@Prop({ type: Object, default: null })
	raw: unknown;
}

export const InboxMessageSchema = SchemaFactory.createForClass(InboxMessage);

// A repeated delivery of the same message must not be stored twice. Telegram
// numbers messages per chat, hence the conversation in the key.
InboxMessageSchema.index(
	{ ownerUserId: 1, conversationId: 1, channelMessageId: 1, direction: 1 },
	{ unique: true },
);
InboxMessageSchema.index({ ownerUserId: 1, conversationId: 1, _id: -1 }); // one conversation, newest first
InboxMessageSchema.index({ ownerUserId: 1, conversationId: 1, sentAt: -1 }); // a customer's timeline

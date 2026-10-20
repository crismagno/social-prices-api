import mongoose from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import InboxEnum from './interfaces/inbox.enum';
import { IInboxContact } from './interfaces/inbox.types';

@Schema({ timestamps: true, collection: 'inbox_conversations' })
export class InboxConversation {
	@Prop({ required: true, type: mongoose.Schema.Types.ObjectId })
	ownerUserId: mongoose.Schema.Types.ObjectId;

	@Prop({
		required: true,
		type: String,
		enum: Object.values(InboxEnum.Channel),
	})
	channel: InboxEnum.Channel;

	@Prop({ required: true, type: String })
	contactKey: string;

	@Prop({ type: String, default: null })
	accountKey: string | null;

	@Prop({ type: Object, default: {} })
	contact: IInboxContact;

	@Prop({ type: mongoose.Schema.Types.ObjectId, default: null })
	customerId: mongoose.Schema.Types.ObjectId | null;

	@Prop({ type: Date, default: null })
	customerChangedAt: Date | null;

	@Prop({ type: Date, default: null })
	lastMessageAt: Date | null;

	@Prop({ type: String, default: null })
	lastMessageText: string | null;

	@Prop({
		type: String,
		enum: [...Object.values(InboxEnum.MessageKind), null],
		default: null,
	})
	lastMessageKind: InboxEnum.MessageKind | null;

	@Prop({ type: String, default: null })
	lastMessageChannelKind: string | null;

	@Prop({
		type: String,
		enum: [...Object.values(InboxEnum.Direction), null],
		default: null,
	})
	lastMessageDirection: InboxEnum.Direction | null;

	@Prop({ type: Date, default: () => new Date(0) })
	lastIncomingAt: Date;

	@Prop({ type: Number, default: 0 })
	unreadCount: number;
}

export const InboxConversationSchema =
	SchemaFactory.createForClass(InboxConversation);

// One conversation per person per channel.
InboxConversationSchema.index(
	{ ownerUserId: 1, channel: 1, contactKey: 1 },
	{ unique: true },
);
InboxConversationSchema.index({ ownerUserId: 1, customerId: 1 }); // everything a customer has
InboxConversationSchema.index({ ownerUserId: 1, lastMessageAt: -1 }); // the inbox, most recent first
InboxConversationSchema.index({
	ownerUserId: 1,
	channel: 1,
	lastMessageAt: -1,
}); // one channel's inbox

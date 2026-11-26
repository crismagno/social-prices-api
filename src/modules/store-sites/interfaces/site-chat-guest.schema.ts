import mongoose from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/**
 * Someone who started a chat on a store's site, without an account. They are
 * known only by a secret their browser keeps; here is only its hash.
 */
@Schema({ timestamps: true, collection: 'site-chat-guests' })
export class SiteChatGuest {
	readonly _id: mongoose.Schema.Types.ObjectId;

	@Prop({ required: true, type: mongoose.Schema.Types.ObjectId })
	ownerUserId: mongoose.Schema.Types.ObjectId;

	@Prop({ required: true, type: mongoose.Schema.Types.ObjectId })
	storeId: mongoose.Schema.Types.ObjectId;

	@Prop({ required: true, type: String })
	tokenHash: string;

	@Prop({ type: mongoose.Schema.Types.ObjectId, default: null })
	conversationId: mongoose.Schema.Types.ObjectId | null;

	@Prop({ required: true, type: String })
	name: string;

	@Prop({ type: String, default: null })
	email: string | null;

	@Prop({ type: String, default: null })
	phone: string | null;

	/** What the visitor answered to the owner's own fields. */
	@Prop({ type: [Object], default: [] })
	answers: { field: string; label: string; value: string }[];

	/** When the visitor last wrote: the chat is theirs for an hour after it. */
	@Prop({ type: Date, default: null })
	lastActiveAt: Date | null;

	createdAt: Date;

	updatedAt: Date;
}

export const SiteChatGuestSchema = SchemaFactory.createForClass(SiteChatGuest);

SiteChatGuestSchema.index({ tokenHash: 1 }, { unique: true });
SiteChatGuestSchema.index({ storeId: 1 });

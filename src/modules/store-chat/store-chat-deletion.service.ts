import mongoose from 'mongoose';

import {
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';

import { AppsRealtimeGateway } from '../apps/core/realtime/apps-realtime.gateway';
import { InboxConversationsService } from '../inbox/inbox-conversations.service';
import { InboxMessagesService } from '../inbox/inbox-messages.service';
import InboxEnum from '../inbox/interfaces/inbox.enum';
import {
	IInboxConversation,
	IInboxMessage,
} from '../inbox/interfaces/inbox.types';
import { StoreChatMediaService } from './store-chat-media.service';
import { STORE_CHAT_CODES } from './store-chat.constants';

/**
 * Removing a message of the store chat. Each side removes only what it wrote
 * (`IN` the customer, `OUT` the store), and it is gone for both: there is one
 * conversation, not a copy per side.
 */
@Injectable()
export class StoreChatDeletionService {
	//#region Constructor

	constructor(
		private readonly _messages: InboxMessagesService,
		private readonly _conversations: InboxConversationsService,
		private readonly _realtime: AppsRealtimeGateway,
		private readonly _media: StoreChatMediaService,
	) {}

	//#endregion

	//#region Public Methods

	/** `by` is the side asking: the direction of the messages it wrote. */
	public async remove(
		conversation: IInboxConversation,
		messageId: string,
		by: InboxEnum.Direction,
	): Promise<void> {
		const ownerUserId: string = String(conversation.ownerUserId);
		const conversationId: string = String(conversation._id);

		const message: IInboxMessage | null = mongoose.isValidObjectId(messageId)
			? await this._messages.findOwned(ownerUserId, conversationId, messageId)
			: null;

		if (!message) {
			throw new NotFoundException('Message not found.');
		}

		if (message.direction !== by) {
			throw new ForbiddenException({
				code: STORE_CHAT_CODES.NOT_YOUR_MESSAGE,
				message: 'Only who wrote a message can remove it.',
			});
		}

		if (
			!(await this._messages.softDeleteOwned(
				ownerUserId,
				conversationId,
				messageId,
			))
		) {
			throw new NotFoundException('Message not found.');
		}

		// Its files leave the storage too: removed means gone.
		await this._media.removeFilesOf(message);

		await this._refreshPreview(conversation, ownerUserId, conversationId);

		const event = {
			storeId: String(conversation.accountKey),
			conversationId,
		};

		this._realtime.notifyStoreChatUpdated(ownerUserId, event);

		if (conversation.contactUserId) {
			this._realtime.notifyStoreChatUpdated(
				String(conversation.contactUserId),
				event,
			);
		}
	}

	//#endregion

	//#region Private Methods

	/**
	 * The lists show the newest message that is left. With none left the
	 * conversation keeps its place, with nothing to preview.
	 */
	private async _refreshPreview(
		conversation: IInboxConversation,
		ownerUserId: string,
		conversationId: string,
	): Promise<void> {
		const latest: IInboxMessage | null = await this._messages.findLatest(
			ownerUserId,
			conversationId,
		);

		await this._conversations.setPreview(ownerUserId, conversationId, {
			text: latest?.text ?? null,
			kind: latest?.kind ?? InboxEnum.MessageKind.TEXT,
			channelKind: null,
			direction: latest?.direction ?? InboxEnum.Direction.IN,
			at: latest?.sentAt ?? conversation.lastMessageAt,
		});
	}

	//#endregion
}

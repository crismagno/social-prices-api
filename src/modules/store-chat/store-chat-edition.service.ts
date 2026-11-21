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
import { STORE_CHAT_CODES } from './store-chat.constants';

/**
 * Changing the words of a message of the store chat: its text, or the caption
 * of its file. Each side changes only what it wrote (`IN` the customer, `OUT`
 * the store), and both see the new words: there is one conversation, not a
 * copy per side.
 */
@Injectable()
export class StoreChatEditionService {
	//#region Constructor

	constructor(
		private readonly _messages: InboxMessagesService,
		private readonly _conversations: InboxConversationsService,
		private readonly _realtime: AppsRealtimeGateway,
	) {}

	//#endregion

	//#region Public Methods

	/**
	 * `by` is the side asking: the direction of the messages it wrote. `body` is
	 * the new text as it is stored, already checked by who calls.
	 */
	public async edit(
		conversation: IInboxConversation,
		messageId: string,
		by: InboxEnum.Direction,
		body: string,
	): Promise<IInboxMessage> {
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
				message: 'Only who wrote a message can change it.',
			});
		}

		// The same words: nothing changed, so nothing is marked as edited.
		if (body === message.text) {
			return message;
		}

		const edited: IInboxMessage | null = await this._messages.editText(
			ownerUserId,
			conversationId,
			messageId,
			body,
		);

		if (!edited) {
			throw new NotFoundException('Message not found.');
		}

		await this._refreshPreview(ownerUserId, conversationId, edited);

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

		return edited;
	}

	//#endregion

	//#region Private Methods

	/** The lists show the words of the newest message: they follow an edit of it. */
	private async _refreshPreview(
		ownerUserId: string,
		conversationId: string,
		edited: IInboxMessage,
	): Promise<void> {
		const latest: IInboxMessage | null = await this._messages.findLatest(
			ownerUserId,
			conversationId,
		);

		if (!latest || String(latest._id) !== String(edited._id)) {
			return;
		}

		await this._conversations.setPreview(ownerUserId, conversationId, {
			text: edited.text,
			kind: edited.kind,
			channelKind: null,
			direction: edited.direction,
			at: edited.sentAt,
		});
	}

	//#endregion
}

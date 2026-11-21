import {
	BadRequestException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';

import { ChatFilesService } from '../files/chat-files-service';
import { IInboxUploadFile } from '../inbox/inbox-channel.adapter';
import InboxEnum from '../inbox/interfaces/inbox.enum';
import {
	IInboxAttachment,
	IInboxMessage,
} from '../inbox/interfaces/inbox.types';
import {
	STORE_CHAT_CODES,
	STORE_CHAT_MAX_TEXT,
	STORE_CHAT_MAX_UPLOAD_BYTES,
} from './store-chat.constants';

export interface IStoreChatFile {
	buffer: Buffer;
	contentType: string;
	fileName: string | null;
}

/**
 * The files and recordings of the store chat: kept in the chat's own storage,
 * and read back only through a message of a conversation, so only the two
 * sides of it can ever get them.
 */
@Injectable()
export class StoreChatMediaService {
	//#region Constructor

	constructor(private readonly _files: ChatFilesService) {}

	//#endregion

	//#region Public Methods

	/** Refuses a file that cannot be sent, before anything is stored or opened. */
	public assertSendable(file: IInboxUploadFile): void {
		if (!file?.buffer?.length) {
			throw new BadRequestException('A file is required.');
		}

		if (file.buffer.length > STORE_CHAT_MAX_UPLOAD_BYTES) {
			throw new BadRequestException({
				code: STORE_CHAT_CODES.FILE_TOO_LARGE,
				message: 'The file is larger than the chat takes.',
			});
		}
	}

	/** The text that goes with a file, when there is one. */
	public caption(text: unknown): string | null {
		const caption: string = typeof text === 'string' ? text.trim() : '';

		if (caption.length > STORE_CHAT_MAX_TEXT) {
			throw new BadRequestException(
				`The message must have at most ${STORE_CHAT_MAX_TEXT} characters.`,
			);
		}

		return caption || null;
	}

	/** Stores the file and describes it as a message carries it. */
	public async store(
		file: IInboxUploadFile,
		asVoice: boolean,
	): Promise<IInboxAttachment> {
		this.assertSendable(file);

		const key: string = await this._files.save(file);

		return {
			kind: this.kindOf(file.mimeType, asVoice),
			mimeType: file.mimeType || null,
			fileName: file.fileName || null,
			size: file.buffer.length,
			width: null,
			height: null,
			duration: null,
			source: { type: InboxEnum.AttachmentSourceType.STORED_FILE, key },
		};
	}

	public kindOf(mimeType: string, asVoice: boolean): InboxEnum.MessageKind {
		if (asVoice) {
			return InboxEnum.MessageKind.VOICE;
		}

		if (mimeType?.startsWith('image/')) {
			return InboxEnum.MessageKind.IMAGE;
		}

		if (mimeType?.startsWith('video/')) {
			return InboxEnum.MessageKind.VIDEO;
		}

		if (mimeType?.startsWith('audio/')) {
			return InboxEnum.MessageKind.AUDIO;
		}

		return InboxEnum.MessageKind.FILE;
	}

	/** One file of a message, as it was sent. */
	public async read(
		message: IInboxMessage,
		index: number,
	): Promise<IStoreChatFile> {
		const attachment: IInboxAttachment | undefined =
			message?.attachments?.[index];

		const buffer: Buffer | null =
			attachment?.source?.type === InboxEnum.AttachmentSourceType.STORED_FILE
				? await this._files.read(attachment.source.key)
				: null;

		if (!attachment || !buffer) {
			throw new NotFoundException('Attachment not found.');
		}

		return {
			buffer,
			contentType: attachment.mimeType ?? 'application/octet-stream',
			fileName: attachment.fileName,
		};
	}

	/** A removed message takes its files with it. Never fails the removal. */
	public async removeFilesOf(message: IInboxMessage): Promise<void> {
		for (const attachment of message?.attachments ?? []) {
			if (
				attachment?.source?.type === InboxEnum.AttachmentSourceType.STORED_FILE
			) {
				await this._files.remove(attachment.source.key);
			}
		}
	}

	//#endregion
}

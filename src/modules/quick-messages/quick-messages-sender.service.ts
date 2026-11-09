import { Model } from 'mongoose';

import {
	BadRequestException,
	ConflictException,
	HttpException,
	HttpStatus,
	Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { schemasName } from '../../infra/database/mongo/schemas';
import { ICustomer } from '../customers/interfaces/customer.interface';
import { Customer } from '../customers/interfaces/customer.schema';
import { EmployeesService } from '../employees/employees.service';
import { IEmployee } from '../employees/interfaces/employee.interface';
import { FilesService } from '../files/files-service';
import { IInboxReplyContext } from '../inbox/inbox-channel.adapter';
import {
	FILE_TOO_LARGE_CODE,
	InboxCentralService,
	MEDIA_NOT_SUPPORTED_CODE,
	REPLY_WINDOW_CLOSED_CODE,
} from '../inbox/inbox-central.service';
import { IInboxMessageView } from '../inbox/interfaces/inbox-central.types';
import { IInboxConversation } from '../inbox/interfaces/inbox.types';
import { IUser } from '../users/interfaces/user.interface';
import { UsersService } from '../users/users.service';
import {
	IQuickMessage,
	IQuickMessageBlock,
	IQuickMessageMediaBlock,
} from './interfaces/quick-message.interface';
import QuickMessagesEnum from './interfaces/quick-messages.enum';
import { IQuickMessageSendResult } from './interfaces/quick-messages.type';
import { buildFieldValues, renderTemplate } from './quick-messages-fields';
import { QuickMessagesService } from './quick-messages.service';

// A block ready to go: its text filled in, its file already read.
type ReadyBlock =
	| { type: QuickMessagesEnum.BlockType.TEXT; text: string }
	| {
			type: QuickMessagesEnum.BlockType.MEDIA;
			block: IQuickMessageMediaBlock;
			buffer: Buffer;
			caption: string | null;
	  };

/**
 * Sends a quick message through a conversation, block by block, the same way a
 * person would. Everything that can be known beforehand is checked before the
 * first block goes, so the customer does not get half a message.
 */
@Injectable()
export class QuickMessagesSenderService {
	//#region Constructor

	constructor(
		private readonly _quickMessagesService: QuickMessagesService,
		private readonly _inboxCentralService: InboxCentralService,
		private readonly _filesService: FilesService,
		@InjectModel(schemasName.customer)
		private readonly _customerModel: Model<Customer>,
		private readonly _employeesService: EmployeesService,
		private readonly _usersService: UsersService,
	) {}

	//#endregion

	//#region Public methods

	public async send(
		ctx: IInboxReplyContext,
		quickMessageId: string,
		conversationId: string,
	): Promise<IQuickMessageSendResult> {
		const message: IQuickMessage =
			await this._quickMessagesService.findOneOwned(
				ctx.ownerUserId,
				quickMessageId,
			);

		await this._quickMessagesService.assertCanUse(ctx, message);

		const target = await this._inboxCentralService.getSendTarget(
			ctx.ownerUserId,
			conversationId,
		);

		if (!target.canReply) {
			throw new ConflictException({
				code: REPLY_WINDOW_CLOSED_CODE,
				message: 'The answer window of this conversation is closed.',
			});
		}

		const buffers: Map<IQuickMessageBlock, Buffer> = await this._readFiles(
			message.blocks,
			target.canSendMedia,
			target.capabilities.maxUploadBytes,
		);

		const values: Record<string, string> = buildFieldValues(
			await this._fieldSource(ctx, target.conversation),
		);

		const ready: ReadyBlock[] = this._render(message.blocks, buffers, values);

		const sent: IInboxMessageView[] = [];

		for (const block of ready) {
			try {
				sent.push(await this._sendBlock(ctx, conversationId, block));
			} catch (error) {
				if (!sent.length) {
					throw error;
				}

				throw new HttpException(
					{
						code: QuickMessagesEnum.ErrorCode.PARTIAL_SEND,
						message: error?.message ?? 'The channel refused a block.',
						sentCount: sent.length,
						totalCount: ready.length,
						messages: sent,
					},
					error instanceof HttpException
						? error.getStatus()
						: HttpStatus.BAD_GATEWAY,
				);
			}
		}

		await this._quickMessagesService.registerUse(quickMessageId);

		return { messages: sent, sentCount: sent.length, totalCount: ready.length };
	}

	//#endregion

	//#region Private methods

	// Reads every file up front: a missing or oversized one stops it all before sending.
	private async _readFiles(
		blocks: IQuickMessageBlock[],
		canSendMedia: boolean,
		maxUploadBytes: number | null,
	): Promise<Map<IQuickMessageBlock, Buffer>> {
		const buffers: Map<IQuickMessageBlock, Buffer> = new Map();

		const mediaBlocks: IQuickMessageMediaBlock[] = blocks.filter(
			(block: IQuickMessageBlock): block is IQuickMessageMediaBlock =>
				block.type === QuickMessagesEnum.BlockType.MEDIA,
		);

		if (mediaBlocks.length && !canSendMedia) {
			throw new ConflictException({
				code: MEDIA_NOT_SUPPORTED_CODE,
				message: 'This channel does not take files.',
			});
		}

		for (const block of mediaBlocks) {
			const buffer: Buffer | null =
				await this._filesService.getFileBufferByFilename(block.fileKey);

			if (!buffer?.length) {
				throw new ConflictException({
					code: QuickMessagesEnum.ErrorCode.FILE_MISSING,
					message: `The file ${block.fileName} of this quick message is no longer available.`,
				});
			}

			if (maxUploadBytes !== null && buffer.length > maxUploadBytes) {
				throw new BadRequestException({
					code: FILE_TOO_LARGE_CODE,
					message: `The file ${block.fileName} is larger than this channel takes.`,
				});
			}

			buffers.set(block, buffer);
		}

		return buffers;
	}

	private _render(
		blocks: IQuickMessageBlock[],
		buffers: Map<IQuickMessageBlock, Buffer>,
		values: Record<string, string>,
	): ReadyBlock[] {
		const ready: ReadyBlock[] = [];

		for (const block of blocks) {
			if (block.type === QuickMessagesEnum.BlockType.TEXT) {
				const text: string = renderTemplate(block.text, values).trim();

				// The fields can make it longer than the channels take: refuse now,
				// not halfway through.
				if (text.length > QuickMessagesEnum.MAX_TEXT_LENGTH) {
					throw new BadRequestException(
						`A text of this quick message has more than ${QuickMessagesEnum.MAX_TEXT_LENGTH} characters once filled in.`,
					);
				}

				// Only empty fields in it: nothing to say.
				if (text) {
					ready.push({ type: block.type, text });
				}

				continue;
			}

			ready.push({
				type: block.type,
				block,
				buffer: buffers.get(block),
				caption: renderTemplate(block.caption ?? '', values).trim() || null,
			});
		}

		return ready;
	}

	private async _sendBlock(
		ctx: IInboxReplyContext,
		conversationId: string,
		block: ReadyBlock,
	): Promise<IInboxMessageView> {
		if (block.type === QuickMessagesEnum.BlockType.TEXT) {
			return this._inboxCentralService.reply(ctx, conversationId, block.text);
		}

		return this._inboxCentralService.sendMedia(
			ctx,
			conversationId,
			{
				buffer: block.buffer,
				fileName: block.block.fileName,
				mimeType: block.block.mimeType,
			},
			{ caption: block.caption, asVoice: false },
		);
	}

	private async _fieldSource(
		ctx: IInboxReplyContext,
		conversation: IInboxConversation,
	) {
		const customer: ICustomer | null = conversation.customerId
			? ((await this._customerModel
					.findOne({
						_id: conversation.customerId,
						ownerUserId: ctx.ownerUserId,
					})
					.lean()) as unknown as ICustomer | null)
			: null;

		const employee: IEmployee | null = ctx.employeeId
			? await this._employeesService.findById(ctx.employeeId)
			: null;

		const user: IUser | null = employee
			? null
			: (await this._usersService.findOneById(ctx.ownerUserId)) ?? null;

		return {
			customer,
			contact: conversation.contact ?? null,
			employee,
			user,
		};
	}

	//#endregion
}

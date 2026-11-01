import {
	BadRequestException,
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	Param,
	ParseIntPipe,
	Post,
	Query,
	Res,
	UploadedFile,
	UseGuards,
	UseInterceptors,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';

import { AuthPayload } from '../auth/decorators/current-user.decorator';
import { IAuthPayload } from '../auth/interfaces/auth.types';
import { AppEmployeeLevelGuard } from '../apps/core/guards/app-employee-level.guard';
import { mediaResponseHeaders } from '../apps/telegram/telegram.media-response';
import { InboxCentralService } from './inbox-central.service';
import {
	InboxAssignCustomerDto,
	InboxChatsQueryDto,
	InboxMessagesQueryDto,
	InboxReplyDto,
	InboxSendMediaDto,
	InboxScopeQueryDto,
} from './inbox.dto';
import {
	IInboxChatView,
	IInboxConversationView,
	IInboxMessageView,
} from './interfaces/inbox-central.types';

// The most any channel takes (Messenger's 25 MB); each channel checks its own limit.
const MAX_UPLOAD_BYTES: number = 25 * 1024 * 1024;

const validation = new ValidationPipe({ transform: true });

/** The central chat: every channel's conversations, by customer. */
@Controller('api/v1/inbox')
export class InboxController {
	constructor(private readonly _central: InboxCentralService) {}

	@Get('chats')
	@UsePipes(validation)
	public async listChats(
		@AuthPayload() authPayload: IAuthPayload,
		@Query() query: InboxChatsQueryDto,
	): Promise<IInboxChatView[]> {
		return await this._central.listChats(authPayload._id, query.channel);
	}

	@Get('messages')
	@UsePipes(validation)
	public async listMessages(
		@AuthPayload() authPayload: IAuthPayload,
		@Query() query: InboxMessagesQueryDto,
	): Promise<IInboxMessageView[]> {
		return await this._central.listMessages(
			authPayload._id,
			{
				customerId: query.customerId,
				conversationId: query.conversationId,
				channel: query.channel,
			},
			{ limit: query.limit, before: query.before },
		);
	}

	@Post('read')
	@HttpCode(204)
	@UsePipes(validation)
	public async markRead(
		@AuthPayload() authPayload: IAuthPayload,
		@Body() body: InboxScopeQueryDto,
	): Promise<void> {
		await this._central.markRead(authPayload._id, body);
	}

	@Post('conversations/:conversationId/customer')
	@HttpCode(200)
	@UsePipes(validation)
	public async assignCustomer(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('conversationId') conversationId: string,
		@Body() body: InboxAssignCustomerDto,
	): Promise<IInboxChatView> {
		return await this._central.assignCustomer(
			authPayload._id,
			conversationId,
			body.customerId ?? null,
		);
	}

	@Post('conversations/:conversationId/customer/create')
	@HttpCode(200)
	public async createCustomer(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('conversationId') conversationId: string,
	): Promise<IInboxChatView> {
		return await this._central.createCustomer(authPayload._id, conversationId);
	}

	@Post('conversations/:conversationId/messages')
	@UsePipes(validation)
	public async reply(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('conversationId') conversationId: string,
		@Body() body: InboxReplyDto,
	): Promise<IInboxMessageView> {
		return await this._central.reply(
			{
				ownerUserId: authPayload._id,
				employeeId: authPayload.employeeId ?? null,
			},
			conversationId,
			body.text,
		);
	}

	@Get('customers/:customerId/summary')
	public async summary(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('customerId') customerId: string,
	): Promise<IInboxConversationView[]> {
		return await this._central.summary(authPayload._id, customerId);
	}

	// "typing…" for the person while the user writes; never fails the page.
	@Post('conversations/:conversationId/typing')
	@HttpCode(204)
	public async typing(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('conversationId') conversationId: string,
	): Promise<void> {
		await this._central.typing(
			{
				ownerUserId: authPayload._id,
				employeeId: authPayload.employeeId ?? null,
			},
			conversationId,
		);
	}

	// A file or a recording. The text, when there is one, is its caption (or a
	// message of its own where the channel has no captions).
	@Post('conversations/:conversationId/media')
	@HttpCode(200)
	@UsePipes(validation)
	@UseInterceptors(
		FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }),
	)
	public async sendMedia(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('conversationId') conversationId: string,
		@UploadedFile() file: Express.Multer.File,
		@Body() dto: InboxSendMediaDto,
	): Promise<IInboxMessageView> {
		if (!file?.buffer?.length) {
			throw new BadRequestException('A file is required.');
		}

		return await this._central.sendMedia(
			{
				ownerUserId: authPayload._id,
				employeeId: authPayload.employeeId ?? null,
			},
			conversationId,
			{
				buffer: file.buffer,
				// Multer reads the name as latin1; the browser sent UTF-8.
				fileName: Buffer.from(file.originalname, 'latin1').toString('utf8'),
				mimeType: file.mimetype,
			},
			{ caption: dto.caption?.trim() || null, asVoice: dto.voice === true },
		);
	}

	// Removing a message changes the owner's data (and, in Telegram, the customer's
	// chat), so an employee needs ADMIN or MASTER, like the apps' own pages.
	@Delete('messages/:messageId')
	@HttpCode(204)
	@UseGuards(AppEmployeeLevelGuard)
	public async deleteMessage(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('messageId') messageId: string,
	): Promise<void> {
		await this._central.deleteMessage(authPayload._id, messageId);
	}

	@Get('messages/:messageId/attachments/:index')
	public async getAttachment(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('messageId') messageId: string,
		@Param('index', ParseIntPipe) index: number,
		@Res() res: Response,
	): Promise<void> {
		const file = await this._central.getAttachment(
			authPayload._id,
			messageId,
			index,
		);

		res.set(mediaResponseHeaders(file.contentType, file.fileName ?? 'file'));
		res.send(file.buffer);
	}
}

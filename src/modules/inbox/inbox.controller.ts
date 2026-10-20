import {
	Body,
	Controller,
	Get,
	HttpCode,
	Param,
	ParseIntPipe,
	Post,
	Query,
	Res,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';
import { Response } from 'express';

import { AuthPayload } from '../auth/decorators/current-user.decorator';
import { IAuthPayload } from '../auth/interfaces/auth.types';
import { mediaResponseHeaders } from '../apps/telegram/telegram.media-response';
import { InboxCentralService } from './inbox-central.service';
import {
	InboxAssignCustomerDto,
	InboxMessagesQueryDto,
	InboxReplyDto,
	InboxScopeQueryDto,
} from './inbox.dto';
import {
	IInboxChatView,
	IInboxConversationView,
	IInboxMessageView,
} from './interfaces/inbox-central.types';

const validation = new ValidationPipe({ transform: true });

/** The central chat: every channel's conversations, by customer. */
@Controller('api/v1/inbox')
export class InboxController {
	constructor(private readonly _central: InboxCentralService) {}

	@Get('chats')
	public async listChats(
		@AuthPayload() authPayload: IAuthPayload,
	): Promise<IInboxChatView[]> {
		return await this._central.listChats(authPayload._id);
	}

	@Get('messages')
	@UsePipes(validation)
	public async listMessages(
		@AuthPayload() authPayload: IAuthPayload,
		@Query() query: InboxMessagesQueryDto,
	): Promise<IInboxMessageView[]> {
		return await this._central.listMessages(
			authPayload._id,
			{ customerId: query.customerId, conversationId: query.conversationId },
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

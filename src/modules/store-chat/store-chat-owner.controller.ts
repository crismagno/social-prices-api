import {
	Body,
	Controller,
	Get,
	Param,
	Post,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';

import { AuthPayload } from '../auth/decorators/current-user.decorator';
import { IAuthPayload } from '../auth/interfaces/auth.types';
import StartStoreChatDto from './interfaces/dto/startStoreChat.dto';
import { IStoreChatStarted } from './interfaces/store-chat.types';
import { StoreChatOwnerService } from './store-chat-owner.service';

/**
 * What the store's side needs besides the central inbox: writing first to a
 * customer, and its unread count. Company accounts only (no `@AllowCustomer`).
 */
@Controller('api/v1/store-chat')
export class StoreChatOwnerController {
	constructor(private readonly _storeChatOwnerService: StoreChatOwnerService) {}

	@Get('owner/unread-count')
	public async countUnread(
		@AuthPayload() authPayload: IAuthPayload,
	): Promise<number> {
		return await this._storeChatOwnerService.countUnread(authPayload._id);
	}

	@Post('customers/:customerId/messages')
	@UsePipes(ValidationPipe)
	public async start(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('customerId') customerId: string,
		@Body() body: StartStoreChatDto,
	): Promise<IStoreChatStarted> {
		return await this._storeChatOwnerService.start(
			{
				ownerUserId: authPayload._id,
				employeeId: authPayload.employeeId ?? null,
			},
			customerId,
			body.storeId,
			body.text,
		);
	}
}

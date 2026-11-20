import {
	Body,
	Controller,
	Get,
	HttpCode,
	Param,
	Post,
	Query,
	UseGuards,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';

import { AllowCustomer } from '../../shared/decorators/custom.decorator';
import {
	ITableStateRequest,
	ITableStateResponse,
} from '../../shared/utils/table/table-state.interface';
import { AuthPayload } from '../auth/decorators/current-user.decorator';
import { IAuthPayload } from '../auth/interfaces/auth.types';
import { CustomerOnlyGuard } from '../customer-portal/customer-only.guard';
import { IStore } from '../stores/interfaces/store.interface';
import SendStoreChatMessageDto from './interfaces/dto/sendStoreChatMessage.dto';
import {
	IStoreChatBuyer,
	IStoreChatConversationView,
	IStoreChatMessageView,
	IStoreChatStoreCard,
} from './interfaces/store-chat.types';
import { StoreChatStoresService } from './store-chat-stores.service';
import { StoreChatService } from './store-chat.service';

const buyerOf = (payload: IAuthPayload): IStoreChatBuyer => ({
	userId: payload._id,
	email: payload.email,
});

/** The store chat as a customer account uses it: find a store, read, write. */
@AllowCustomer()
@UseGuards(CustomerOnlyGuard)
@Controller('api/v1/store-chat')
export class StoreChatController {
	constructor(
		private readonly _storeChatService: StoreChatService,
		private readonly _storeChatStoresService: StoreChatStoresService,
	) {}

	@Get('conversations')
	public async listConversations(
		@AuthPayload() authPayload: IAuthPayload,
	): Promise<IStoreChatConversationView[]> {
		return await this._storeChatService.listConversations(buyerOf(authPayload));
	}

	@Get('unread-count')
	public async countUnread(
		@AuthPayload() authPayload: IAuthPayload,
	): Promise<number> {
		return await this._storeChatService.countUnread(buyerOf(authPayload));
	}

	@Post('stores/search')
	@HttpCode(200)
	public async searchStores(
		@AuthPayload() authPayload: IAuthPayload,
		@Body() tableState: ITableStateRequest<IStore>,
	): Promise<ITableStateResponse<IStoreChatStoreCard[]>> {
		return await this._storeChatStoresService.search(
			buyerOf(authPayload),
			tableState ?? {},
		);
	}

	@Get('stores/:storeId')
	public async findStore(
		@Param('storeId') storeId: string,
	): Promise<IStoreChatStoreCard> {
		return this._storeChatStoresService.toCard(
			await this._storeChatStoresService.findUsable(storeId),
		);
	}

	@Get('stores/:storeId/messages')
	public async listMessages(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('storeId') storeId: string,
		@Query('before') before?: string,
	): Promise<IStoreChatMessageView[]> {
		return await this._storeChatService.listMessages(
			buyerOf(authPayload),
			storeId,
			before,
		);
	}

	@Post('stores/:storeId/messages')
	@UsePipes(ValidationPipe)
	public async send(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('storeId') storeId: string,
		@Body() body: SendStoreChatMessageDto,
	): Promise<IStoreChatMessageView> {
		return await this._storeChatService.send(
			buyerOf(authPayload),
			storeId,
			body.text,
		);
	}

	@Post('stores/:storeId/read')
	@HttpCode(204)
	public async markRead(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('storeId') storeId: string,
	): Promise<void> {
		await this._storeChatService.markRead(buyerOf(authPayload), storeId);
	}
}

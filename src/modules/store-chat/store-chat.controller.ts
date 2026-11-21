import { Response } from 'express';

import {
	BadRequestException,
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	Param,
	ParseIntPipe,
	Patch,
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

import { AllowCustomer } from '../../shared/decorators/custom.decorator';
import {
	ITableStateRequest,
	ITableStateResponse,
} from '../../shared/utils/table/table-state.interface';
import { AuthPayload } from '../auth/decorators/current-user.decorator';
import { IAuthPayload } from '../auth/interfaces/auth.types';
import { mediaResponseHeaders } from '../apps/telegram/telegram.media-response';
import { CustomerOnlyGuard } from '../customer-portal/customer-only.guard';
import { InboxSendMediaDto } from '../inbox/inbox.dto';
import { IStore } from '../stores/interfaces/store.interface';
import SendStoreChatMessageDto from './interfaces/dto/sendStoreChatMessage.dto';
import {
	IStoreChatBuyer,
	IStoreChatConversationView,
	IStoreChatMessageView,
	IStoreChatStoreCard,
} from './interfaces/store-chat.types';
import { StoreChatStoresService } from './store-chat-stores.service';
import { STORE_CHAT_MAX_UPLOAD_BYTES } from './store-chat.constants';
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

	// A file or a recording; the text, when there is one, is its caption.
	@Post('stores/:storeId/media')
	@HttpCode(200)
	@UsePipes(new ValidationPipe({ transform: true }))
	@UseInterceptors(
		FileInterceptor('file', {
			limits: { fileSize: STORE_CHAT_MAX_UPLOAD_BYTES },
		}),
	)
	public async sendMedia(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('storeId') storeId: string,
		@UploadedFile() file: Express.Multer.File,
		@Body() dto: InboxSendMediaDto,
	): Promise<IStoreChatMessageView> {
		if (!file?.buffer?.length) {
			throw new BadRequestException('A file is required.');
		}

		return await this._storeChatService.sendMedia(
			buyerOf(authPayload),
			storeId,
			{
				buffer: file.buffer,
				// Multer reads the name as latin1; the browser sent UTF-8.
				fileName: Buffer.from(file.originalname, 'latin1').toString('utf8'),
				mimeType: file.mimetype,
			},
			{ caption: dto.caption?.trim() || null, asVoice: dto.voice === true },
		);
	}

	@Get('stores/:storeId/messages/:messageId/attachments/:index')
	public async getAttachment(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('storeId') storeId: string,
		@Param('messageId') messageId: string,
		@Param('index', ParseIntPipe) index: number,
		@Res() res: Response,
	): Promise<void> {
		const file = await this._storeChatService.getAttachment(
			buyerOf(authPayload),
			storeId,
			messageId,
			index,
		);

		res.set(mediaResponseHeaders(file.contentType, file.fileName ?? 'file'));
		res.send(file.buffer);
	}

	// The new words of a message the account wrote (or of its file's caption).
	@Patch('stores/:storeId/messages/:messageId')
	@UsePipes(ValidationPipe)
	public async editMessage(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('storeId') storeId: string,
		@Param('messageId') messageId: string,
		@Body() body: SendStoreChatMessageDto,
	): Promise<IStoreChatMessageView> {
		return await this._storeChatService.editMessage(
			buyerOf(authPayload),
			storeId,
			messageId,
			body.text,
		);
	}

	@Delete('stores/:storeId/messages/:messageId')
	@HttpCode(204)
	public async deleteMessage(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('storeId') storeId: string,
		@Param('messageId') messageId: string,
	): Promise<void> {
		await this._storeChatService.deleteMessage(
			buyerOf(authPayload),
			storeId,
			messageId,
		);
	}

	// "typing…" for the store while the customer writes; never fails the page.
	@Post('stores/:storeId/typing')
	@HttpCode(204)
	public async typing(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('storeId') storeId: string,
	): Promise<void> {
		await this._storeChatService.typing(buyerOf(authPayload), storeId);
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

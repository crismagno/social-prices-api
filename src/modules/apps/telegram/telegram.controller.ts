import {
	BadRequestException,
	Body,
	Controller,
	Delete,
	Get,
	Headers,
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

import { Public } from '../../../shared/decorators/custom.decorator';
import { AuthPayload } from '../../auth/decorators/current-user.decorator';
import { IAuthPayload } from '../../auth/interfaces/auth.types';
import { AppEmployeeLevelGuard } from '../core/guards/app-employee-level.guard';
import { AppEnabledGuard } from '../core/guards/app-enabled.guard';
import { RequiresApp } from '../core/guards/requires-app.decorator';
import AppsEnum from '../interfaces/apps.enum';
import { IAppContext } from '../interfaces/apps.types';
import ConnectTelegramBotDto from './telegram-connect.dto';
import {
	ChatMessagesQueryDto,
	LinkTelegramCustomerDto,
	MAX_TELEGRAM_UPLOAD_BYTES,
	SendTelegramMediaDto,
	SendTelegramMessageDto,
} from './telegram-chat.dto';
import { mediaResponseHeaders } from './telegram.media-response';
import { ITelegramMessageRecord } from './telegram-message.interface';
import { ITelegramWebhookStatus, TelegramService } from './telegram.service';
import {
	ITelegramChatView,
	ITelegramConnectionView,
	ITelegramUpdate,
} from './telegram.types';

const toContext = (payload: IAuthPayload): IAppContext => ({
	ownerUserId: payload._id,
	employeeId: payload.employeeId ?? null,
});

const validation = new ValidationPipe({ transform: true });

/**
 * Everything the Telegram app exposes. Connecting and disconnecting the bot
 * change the owner's data, so they need ADMIN or MASTER when an employee is
 * acting. Answering customers and linking them to customers is day-to-day work
 * and open to every employee.
 */
@RequiresApp(AppsEnum.App.TELEGRAM)
@Controller('api/v1/apps/telegram')
export class TelegramController {
	constructor(private readonly _telegramService: TelegramService) {}

	//#region The bot

	@Post('connect')
	@HttpCode(200)
	@UseGuards(AppEnabledGuard, AppEmployeeLevelGuard)
	@UsePipes(validation)
	public async connect(
		@AuthPayload() authPayload: IAuthPayload,
		@Body() dto: ConnectTelegramBotDto,
	): Promise<ITelegramConnectionView> {
		return await this._telegramService.connect(
			toContext(authPayload),
			dto.botToken,
		);
	}

	@Get('connection')
	@UseGuards(AppEnabledGuard)
	public async getConnection(
		@AuthPayload() authPayload: IAuthPayload,
	): Promise<ITelegramConnectionView> {
		return await this._telegramService.getConnection(authPayload._id);
	}

	@Get('webhook-status')
	@UseGuards(AppEnabledGuard)
	public async getWebhookStatus(
		@AuthPayload() authPayload: IAuthPayload,
	): Promise<ITelegramWebhookStatus> {
		return await this._telegramService.getWebhookStatus(authPayload._id);
	}

	@Post('refresh-webhook')
	@HttpCode(200)
	@UseGuards(AppEnabledGuard, AppEmployeeLevelGuard)
	public async refreshWebhook(
		@AuthPayload() authPayload: IAuthPayload,
	): Promise<ITelegramWebhookStatus> {
		return await this._telegramService.refreshWebhook(authPayload._id);
	}

	@Delete('connection')
	@HttpCode(204)
	@UseGuards(AppEnabledGuard, AppEmployeeLevelGuard)
	public async disconnect(
		@AuthPayload() authPayload: IAuthPayload,
	): Promise<void> {
		await this._telegramService.disconnect(toContext(authPayload));
	}

	//#endregion

	//#region The inbox

	@Get('chats')
	@UseGuards(AppEnabledGuard)
	public async listChats(
		@AuthPayload() authPayload: IAuthPayload,
	): Promise<ITelegramChatView[]> {
		return await this._telegramService.listChats(authPayload._id);
	}

	@Get('chats/:chatId/messages')
	@UseGuards(AppEnabledGuard)
	@UsePipes(validation)
	public async getChatMessages(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('chatId', ParseIntPipe) chatId: number,
		@Query() query: ChatMessagesQueryDto,
	): Promise<ITelegramMessageRecord[]> {
		return await this._telegramService.getChatMessages(
			authPayload._id,
			chatId,
			{
				limit: query.limit,
				before: query.before,
			},
		);
	}

	@Post('chats/:chatId/messages')
	@HttpCode(200)
	@UseGuards(AppEnabledGuard)
	@UsePipes(validation)
	public async sendMessage(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('chatId', ParseIntPipe) chatId: number,
		@Body() dto: SendTelegramMessageDto,
	): Promise<ITelegramMessageRecord> {
		return await this._telegramService.sendMessage(
			toContext(authPayload),
			chatId,
			dto.text,
		);
	}

	// Removing a message removes it for the customer too, so it needs more than replying.
	@Delete('chats/:chatId/messages/:messageId')
	@HttpCode(204)
	@UseGuards(AppEnabledGuard, AppEmployeeLevelGuard)
	public async deleteMessage(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('chatId', ParseIntPipe) chatId: number,
		@Param('messageId') messageId: string,
	): Promise<void> {
		await this._telegramService.deleteMessage(
			authPayload._id,
			chatId,
			messageId,
		);
	}

	@Post('chats/:chatId/media')
	@HttpCode(200)
	@UseGuards(AppEnabledGuard)
	@UsePipes(validation)
	@UseInterceptors(
		FileInterceptor('file', {
			limits: { fileSize: MAX_TELEGRAM_UPLOAD_BYTES },
		}),
	)
	public async sendMedia(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('chatId', ParseIntPipe) chatId: number,
		@UploadedFile() file: Express.Multer.File,
		@Body() dto: SendTelegramMediaDto,
	): Promise<ITelegramMessageRecord> {
		if (!file?.buffer?.length) {
			throw new BadRequestException('A file is required.');
		}

		return await this._telegramService.sendMedia(
			toContext(authPayload),
			chatId,
			{
				buffer: file.buffer,
				// Multer reads the name as latin1; the browser sent UTF-8.
				fileName: Buffer.from(file.originalname, 'latin1').toString('utf8'),
				mimeType: file.mimetype,
			},
			dto.caption?.trim() || null,
			dto.voice === true,
		);
	}

	@Get('chats/:chatId/messages/:messageId/media')
	@UseGuards(AppEnabledGuard)
	public async getMedia(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('chatId', ParseIntPipe) chatId: number,
		@Param('messageId') messageId: string,
		@Res() res: Response,
	): Promise<void> {
		const media = await this._telegramService.getMedia(
			authPayload._id,
			chatId,
			messageId,
		);

		res.set(mediaResponseHeaders(media.mimeType, media.fileName));
		res.send(media.buffer);
	}

	@Post('chats/:chatId/read')
	@HttpCode(204)
	@UseGuards(AppEnabledGuard)
	public async markRead(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('chatId', ParseIntPipe) chatId: number,
	): Promise<void> {
		await this._telegramService.markRead(authPayload._id, chatId);
	}

	//#endregion

	//#region Linking to customers

	@Post('chats/:chatId/customer')
	@HttpCode(200)
	@UseGuards(AppEnabledGuard)
	@UsePipes(validation)
	public async linkCustomer(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('chatId', ParseIntPipe) chatId: number,
		@Body() dto: LinkTelegramCustomerDto,
	): Promise<ITelegramChatView> {
		return await this._telegramService.linkCustomer(
			authPayload._id,
			chatId,
			dto.customerId,
		);
	}

	@Post('chats/:chatId/customer/create')
	@HttpCode(200)
	@UseGuards(AppEnabledGuard)
	public async createCustomer(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('chatId', ParseIntPipe) chatId: number,
	): Promise<ITelegramChatView> {
		return await this._telegramService.createCustomerFromChat(
			authPayload._id,
			chatId,
		);
	}

	@Delete('chats/:chatId/customer')
	@UseGuards(AppEnabledGuard)
	public async unlinkCustomer(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('chatId', ParseIntPipe) chatId: number,
	): Promise<ITelegramChatView> {
		return await this._telegramService.unlinkCustomer(authPayload._id, chatId);
	}

	//#endregion

	// Public: Telegram calls this. The key in the path finds the connection and
	// the secret header proves it is really Telegram; the service checks both.
	@Public()
	@Post('webhook/:webhookKey')
	@HttpCode(200)
	public async webhook(
		@Param('webhookKey') webhookKey: string,
		@Headers('x-telegram-bot-api-secret-token') secretToken: string,
		@Body() update: ITelegramUpdate,
	): Promise<{ ok: true }> {
		await this._telegramService.handleWebhook(webhookKey, secretToken, update);

		return { ok: true };
	}
}

import {
	BadRequestException,
	Body,
	Controller,
	Delete,
	ForbiddenException,
	Get,
	Headers,
	HttpCode,
	Param,
	ParseIntPipe,
	Post,
	Query,
	RawBodyRequest,
	Req,
	Res,
	UploadedFile,
	UseGuards,
	UseInterceptors,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';

import { Public } from '../../../shared/decorators/custom.decorator';
import { AuthPayload } from '../../auth/decorators/current-user.decorator';
import { IAuthPayload } from '../../auth/interfaces/auth.types';
import { AppEmployeeLevelGuard } from '../core/guards/app-employee-level.guard';
import { AppEnabledGuard } from '../core/guards/app-enabled.guard';
import { RequiresApp } from '../core/guards/requires-app.decorator';
import AppsEnum from '../interfaces/apps.enum';
import { IAppContext } from '../interfaces/apps.types';
import { mediaResponseHeaders } from '../telegram/telegram.media-response';
import {
	LinkMessengerCustomerDto,
	MAX_MESSENGER_UPLOAD_BYTES,
	MessengerChatMessagesQueryDto,
	SendMessengerMessageDto,
} from './messenger-chat.dto';
import SelectMessengerPageDto from './messenger-connect.dto';
import { IMessengerMessageRecord } from './messenger-message.interface';
import {
	IMessengerChatView,
	IMessengerConnectionView,
	MessengerService,
} from './messenger.service';
import {
	isValidMetaSignature,
	isValidVerifyToken,
} from './messenger.signature';

const toContext = (payload: IAuthPayload): IAppContext => ({
	ownerUserId: payload._id,
	employeeId: payload.employeeId ?? null,
});

const validation = new ValidationPipe({ transform: true });

/**
 * Everything the Messenger app exposes. Connecting and disconnecting the Page
 * need ADMIN or MASTER when an employee acts, like the other apps.
 */
@RequiresApp(AppsEnum.App.FACEBOOK)
@Controller('api/v1/apps/messenger')
export class MessengerController {
	constructor(private readonly _messengerService: MessengerService) {}

	//#region Connection

	@Get('connection')
	@UseGuards(AppEnabledGuard)
	public async getConnection(
		@AuthPayload() authPayload: IAuthPayload,
	): Promise<IMessengerConnectionView> {
		return await this._messengerService.getConnection(authPayload._id);
	}

	@Post('connect')
	@HttpCode(200)
	@UseGuards(AppEnabledGuard, AppEmployeeLevelGuard)
	public async connect(
		@AuthPayload() authPayload: IAuthPayload,
	): Promise<{ url: string }> {
		return {
			url: await this._messengerService.getConnectUrl(toContext(authPayload)),
		};
	}

	// Public: Facebook redirects the browser here. Identity comes from the signed
	// `state`, and the service re-checks that the app is still enabled.
	@Public()
	@Get('callback')
	public async callback(
		@Query() query: Record<string, string>,
		@Res() res: Response,
	): Promise<void> {
		const { redirectTo } = await this._messengerService.handleCallback(query);

		res.redirect(redirectTo);
	}

	// For a user whose login brought several Pages: connects the one picked.
	@Post('connection/page')
	@HttpCode(200)
	@UseGuards(AppEnabledGuard, AppEmployeeLevelGuard)
	@UsePipes(validation)
	public async selectPage(
		@AuthPayload() authPayload: IAuthPayload,
		@Body() dto: SelectMessengerPageDto,
	): Promise<IMessengerConnectionView> {
		await this._messengerService.selectPage(toContext(authPayload), dto.pageId);

		return await this._messengerService.getConnection(authPayload._id);
	}

	@Delete('connection')
	@HttpCode(204)
	@UseGuards(AppEnabledGuard, AppEmployeeLevelGuard)
	public async disconnect(
		@AuthPayload() authPayload: IAuthPayload,
	): Promise<void> {
		await this._messengerService.disconnect(toContext(authPayload));
	}

	//#endregion

	//#region Inbox

	@Get('chats')
	@UseGuards(AppEnabledGuard)
	public async listChats(
		@AuthPayload() authPayload: IAuthPayload,
	): Promise<IMessengerChatView[]> {
		return await this._messengerService.listChats(authPayload._id);
	}

	@Get('chats/:psid/messages')
	@UseGuards(AppEnabledGuard)
	@UsePipes(validation)
	public async getChatMessages(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('psid') psid: string,
		@Query() query: MessengerChatMessagesQueryDto,
	): Promise<IMessengerMessageRecord[]> {
		return await this._messengerService.getChatMessages(authPayload._id, psid, {
			limit: query.limit,
			before: query.before,
		});
	}

	@Post('chats/:psid/messages')
	@HttpCode(200)
	@UseGuards(AppEnabledGuard)
	@UsePipes(validation)
	public async sendMessage(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('psid') psid: string,
		@Body() dto: SendMessengerMessageDto,
	): Promise<IMessengerMessageRecord> {
		return await this._messengerService.sendMessage(
			toContext(authPayload),
			psid,
			dto.text,
		);
	}

	// A file or a recording. Facebook takes up to 25 MB; the text, when there is
	// one, goes as a message of its own (a file carries no caption).
	@Post('chats/:psid/media')
	@HttpCode(200)
	@UseGuards(AppEnabledGuard)
	@UseInterceptors(
		FileInterceptor('file', {
			limits: { fileSize: MAX_MESSENGER_UPLOAD_BYTES },
		}),
	)
	public async sendAttachment(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('psid') psid: string,
		@UploadedFile() file: Express.Multer.File,
	): Promise<IMessengerMessageRecord> {
		if (!file?.buffer?.length) {
			throw new BadRequestException('A file is required.');
		}

		return await this._messengerService.sendAttachment(
			toContext(authPayload),
			psid,
			{
				buffer: file.buffer,
				// Multer reads the name as latin1; the browser sent UTF-8.
				fileName: Buffer.from(file.originalname, 'latin1').toString('utf8'),
				mimeType: file.mimetype,
			},
		);
	}

	// Removes it from the inbox only (Facebook cannot delete a message), so, like
	// the other changes to the owner's data, it needs ADMIN or MASTER.
	@Delete('chats/:psid/messages/:messageId')
	@HttpCode(204)
	@UseGuards(AppEnabledGuard, AppEmployeeLevelGuard)
	public async deleteMessage(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('psid') psid: string,
		@Param('messageId') messageId: string,
	): Promise<void> {
		await this._messengerService.deleteMessage(
			authPayload._id,
			psid,
			messageId,
		);
	}

	@Post('chats/:psid/read')
	@HttpCode(204)
	@UseGuards(AppEnabledGuard)
	public async markRead(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('psid') psid: string,
	): Promise<void> {
		await this._messengerService.markRead(authPayload._id, psid);
	}

	// A file of a message. The browser cannot send the login token from an <img>,
	// so the web fetches it as a blob; only safe types are shown inline.
	@Get('chats/:psid/messages/:messageId/attachments/:index')
	@UseGuards(AppEnabledGuard)
	public async getAttachment(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('psid') psid: string,
		@Param('messageId') messageId: string,
		@Param('index', ParseIntPipe) index: number,
		@Res() res: Response,
	): Promise<void> {
		const file = await this._messengerService.getAttachment(
			authPayload._id,
			psid,
			messageId,
			index,
		);

		res.set(mediaResponseHeaders(file.contentType, `file-${index + 1}`));
		res.send(file.buffer);
	}

	@Post('chats/:psid/customer')
	@HttpCode(200)
	@UseGuards(AppEnabledGuard)
	@UsePipes(validation)
	public async linkCustomer(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('psid') psid: string,
		@Body() dto: LinkMessengerCustomerDto,
	): Promise<IMessengerChatView> {
		return await this._messengerService.linkCustomer(
			authPayload._id,
			psid,
			dto.customerId,
		);
	}

	@Post('chats/:psid/customer/create')
	@HttpCode(200)
	@UseGuards(AppEnabledGuard)
	public async createCustomer(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('psid') psid: string,
	): Promise<IMessengerChatView> {
		return await this._messengerService.createCustomerFromChat(
			authPayload._id,
			psid,
		);
	}

	@Delete('chats/:psid/customer')
	@UseGuards(AppEnabledGuard)
	public async unlinkCustomer(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('psid') psid: string,
	): Promise<IMessengerChatView> {
		return await this._messengerService.unlinkCustomer(authPayload._id, psid);
	}

	//#endregion

	//#region Webhook

	// Public: Meta calls this once, when the webhook is saved in its panel, and
	// expects its own challenge back if the verify token is the one configured.
	@Public()
	@Get('webhook')
	public verifyWebhook(
		@Query('hub.mode') mode: string,
		@Query('hub.verify_token') verifyToken: string,
		@Query('hub.challenge') challenge: string,
		@Res() res: Response,
	): void {
		if (
			mode !== 'subscribe' ||
			!isValidVerifyToken(verifyToken, process.env.META_WEBHOOK_VERIFY_TOKEN)
		) {
			throw new ForbiddenException();
		}

		res.status(200).type('text/plain').send(challenge);
	}

	// Public: Meta calls this for every event. The signature over the raw body
	// proves it is really Meta.
	@Public()
	@Post('webhook')
	@HttpCode(200)
	public async receiveWebhook(
		@Req() req: RawBodyRequest<Request>,
		@Headers('x-hub-signature-256') signature: string,
	): Promise<{ ok: true }> {
		if (
			!isValidMetaSignature(req.rawBody, signature, process.env.META_APP_SECRET)
		) {
			throw new ForbiddenException();
		}

		await this._messengerService.handleWebhook(req.body);

		return { ok: true };
	}

	//#endregion
}

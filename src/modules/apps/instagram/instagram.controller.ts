import {
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
	UseGuards,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';
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
	LinkInstagramCustomerDto,
	InstagramChatMessagesQueryDto,
	SendInstagramMessageDto,
} from './instagram-chat.dto';
import { IInstagramMessageRecord } from './instagram-message.interface';
import {
	IInstagramChatView,
	IInstagramConnectionView,
	InstagramService,
} from './instagram.service';
import {
	isValidInstagramSignature,
	isValidInstagramVerifyToken,
} from './instagram.signature';

const toContext = (payload: IAuthPayload): IAppContext => ({
	ownerUserId: payload._id,
	employeeId: payload.employeeId ?? null,
});

const validation = new ValidationPipe({ transform: true });

/**
 * Everything the Instagram app exposes. Connecting and disconnecting the account
 * need ADMIN or MASTER when an employee acts, like the other apps.
 */
@RequiresApp(AppsEnum.App.INSTAGRAM)
@Controller('api/v1/apps/instagram')
export class InstagramController {
	constructor(private readonly _instagramService: InstagramService) {}

	//#region Connection

	@Get('connection')
	@UseGuards(AppEnabledGuard)
	public async getConnection(
		@AuthPayload() authPayload: IAuthPayload,
	): Promise<IInstagramConnectionView> {
		return await this._instagramService.getConnection(authPayload._id);
	}

	@Post('connect')
	@HttpCode(200)
	@UseGuards(AppEnabledGuard, AppEmployeeLevelGuard)
	public async connect(
		@AuthPayload() authPayload: IAuthPayload,
	): Promise<{ url: string }> {
		return {
			url: await this._instagramService.getConnectUrl(toContext(authPayload)),
		};
	}

	// Public: Instagram redirects the browser here. Identity comes from the signed
	// `state`, and the service re-checks that the app is still enabled.
	@Public()
	@Get('callback')
	public async callback(
		@Query() query: Record<string, string>,
		@Res() res: Response,
	): Promise<void> {
		const { redirectTo } = await this._instagramService.handleCallback(query);

		res.redirect(redirectTo);
	}

	@Delete('connection')
	@HttpCode(204)
	@UseGuards(AppEnabledGuard, AppEmployeeLevelGuard)
	public async disconnect(
		@AuthPayload() authPayload: IAuthPayload,
	): Promise<void> {
		await this._instagramService.disconnect(toContext(authPayload));
	}

	//#endregion

	//#region Inbox

	@Get('chats')
	@UseGuards(AppEnabledGuard)
	public async listChats(
		@AuthPayload() authPayload: IAuthPayload,
	): Promise<IInstagramChatView[]> {
		return await this._instagramService.listChats(authPayload._id);
	}

	@Get('chats/:igsid/messages')
	@UseGuards(AppEnabledGuard)
	@UsePipes(validation)
	public async getChatMessages(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('igsid') igsid: string,
		@Query() query: InstagramChatMessagesQueryDto,
	): Promise<IInstagramMessageRecord[]> {
		return await this._instagramService.getChatMessages(
			authPayload._id,
			igsid,
			{
				limit: query.limit,
				before: query.before,
			},
		);
	}

	@Post('chats/:igsid/messages')
	@HttpCode(200)
	@UseGuards(AppEnabledGuard)
	@UsePipes(validation)
	public async sendMessage(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('igsid') igsid: string,
		@Body() dto: SendInstagramMessageDto,
	): Promise<IInstagramMessageRecord> {
		return await this._instagramService.sendMessage(
			toContext(authPayload),
			igsid,
			dto.text,
		);
	}

	@Post('chats/:igsid/read')
	@HttpCode(204)
	@UseGuards(AppEnabledGuard)
	public async markRead(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('igsid') igsid: string,
	): Promise<void> {
		await this._instagramService.markRead(authPayload._id, igsid);
	}

	// A file of a message. The browser cannot send the login token from an <img>,
	// so the web fetches it as a blob; only safe types are shown inline.
	@Get('chats/:igsid/messages/:messageId/attachments/:index')
	@UseGuards(AppEnabledGuard)
	public async getAttachment(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('igsid') igsid: string,
		@Param('messageId') messageId: string,
		@Param('index', ParseIntPipe) index: number,
		@Res() res: Response,
	): Promise<void> {
		const file = await this._instagramService.getAttachment(
			authPayload._id,
			igsid,
			messageId,
			index,
		);

		res.set(mediaResponseHeaders(file.contentType, `file-${index + 1}`));
		res.send(file.buffer);
	}

	@Post('chats/:igsid/customer')
	@HttpCode(200)
	@UseGuards(AppEnabledGuard)
	@UsePipes(validation)
	public async linkCustomer(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('igsid') igsid: string,
		@Body() dto: LinkInstagramCustomerDto,
	): Promise<IInstagramChatView> {
		return await this._instagramService.linkCustomer(
			authPayload._id,
			igsid,
			dto.customerId,
		);
	}

	@Post('chats/:igsid/customer/create')
	@HttpCode(200)
	@UseGuards(AppEnabledGuard)
	public async createCustomer(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('igsid') igsid: string,
	): Promise<IInstagramChatView> {
		return await this._instagramService.createCustomerFromChat(
			authPayload._id,
			igsid,
		);
	}

	@Delete('chats/:igsid/customer')
	@UseGuards(AppEnabledGuard)
	public async unlinkCustomer(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('igsid') igsid: string,
	): Promise<IInstagramChatView> {
		return await this._instagramService.unlinkCustomer(authPayload._id, igsid);
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
			!isValidInstagramVerifyToken(
				verifyToken,
				process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN,
			)
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
			!isValidInstagramSignature(req.rawBody, signature, [
				process.env.INSTAGRAM_APP_SECRET,
				process.env.META_APP_SECRET,
			])
		) {
			throw new ForbiddenException();
		}

		await this._instagramService.handleWebhook(req.body);

		return { ok: true };
	}

	//#endregion
}

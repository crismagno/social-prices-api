import {
	Body,
	Controller,
	Delete,
	ForbiddenException,
	Get,
	Headers,
	HttpCode,
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
import { ConnectWhatsappDto } from './whatsapp-connect.dto';
import {
	isValidWhatsappSignature,
	isValidWhatsappVerifyToken,
} from './whatsapp.signature';
import { IWhatsappConnectConfig } from './whatsapp.types';
import { IWhatsappConnectionView, WhatsappService } from './whatsapp.service';

const toContext = (payload: IAuthPayload): IAppContext => ({
	ownerUserId: payload._id,
	employeeId: payload.employeeId ?? null,
});

const validation = new ValidationPipe({ transform: true });

/**
 * What the WhatsApp app exposes besides the inbox, which is the central one
 * (`api/v1/inbox`). Connecting and disconnecting the number need ADMIN or MASTER
 * when an employee acts, like the other apps.
 */
@RequiresApp(AppsEnum.App.WHATSAPP)
@Controller('api/v1/apps/whatsapp')
export class WhatsappController {
	constructor(private readonly _whatsappService: WhatsappService) {}

	//#region Connection

	// What the browser needs to open Embedded Signup; nothing in it is secret.
	@Get('connect-config')
	@UseGuards(AppEnabledGuard)
	public getConnectConfig(): IWhatsappConnectConfig {
		return this._whatsappService.getConnectConfig();
	}

	@Get('connection')
	@UseGuards(AppEnabledGuard)
	public async getConnection(
		@AuthPayload() authPayload: IAuthPayload,
	): Promise<IWhatsappConnectionView> {
		return await this._whatsappService.getConnection(authPayload._id);
	}

	@Post('connect')
	@HttpCode(200)
	@UseGuards(AppEnabledGuard, AppEmployeeLevelGuard)
	@UsePipes(validation)
	public async connect(
		@AuthPayload() authPayload: IAuthPayload,
		@Body() dto: ConnectWhatsappDto,
	): Promise<IWhatsappConnectionView> {
		return await this._whatsappService.connect(toContext(authPayload), dto);
	}

	@Delete('connection')
	@HttpCode(204)
	@UseGuards(AppEnabledGuard, AppEmployeeLevelGuard)
	public async disconnect(
		@AuthPayload() authPayload: IAuthPayload,
	): Promise<void> {
		await this._whatsappService.disconnect(toContext(authPayload));
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
			!isValidWhatsappVerifyToken(
				verifyToken,
				process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
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
			!isValidWhatsappSignature(req.rawBody, signature, [
				process.env.WHATSAPP_APP_SECRET,
				process.env.META_APP_SECRET,
			])
		) {
			throw new ForbiddenException();
		}

		await this._whatsappService.handleWebhook(req.body);

		return { ok: true };
	}

	//#endregion
}

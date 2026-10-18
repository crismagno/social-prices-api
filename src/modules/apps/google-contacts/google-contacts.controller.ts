import { Response } from 'express';

import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	Post,
	Query,
	Res,
	UseGuards,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';

import { Public } from '../../../shared/decorators/custom.decorator';
import { AuthPayload } from '../../auth/decorators/current-user.decorator';
import { IAuthPayload } from '../../auth/interfaces/auth.types';
import { AppEmployeeLevelGuard } from '../core/guards/app-employee-level.guard';
import { AppEnabledGuard } from '../core/guards/app-enabled.guard';
import { RequiresApp } from '../core/guards/requires-app.decorator';
import AppsEnum from '../interfaces/apps.enum';
import { IAppContext } from '../interfaces/apps.types';
import { IGoogleContactsConnection } from './google-contacts-connection.interface';
import { GoogleContactsConnectionsService } from './google-contacts-connections.service';
import ImportGoogleContactsDto from './google-contacts-import.dto';
import { GoogleContactsService } from './google-contacts.service';
import {
	IGoogleContactsConnectionView,
	IGoogleContactsImportResponse,
	IGoogleContactsPreview,
} from './google-contacts.types';

const toContext = (payload: IAuthPayload): IAppContext => ({
	ownerUserId: payload._id,
	employeeId: payload.employeeId ?? null,
});

/**
 * Everything the Google Contacts app exposes. Connecting changes the owner's
 * data, so connect / contacts / import / disconnect need ADMIN or MASTER when an
 * employee is acting.
 */
@RequiresApp(AppsEnum.App.GOOGLE_CONTACTS)
@Controller('api/v1/apps/google-contacts')
export class GoogleContactsController {
	constructor(
		private readonly _googleContactsService: GoogleContactsService,
		private readonly _connectionsService: GoogleContactsConnectionsService,
	) {}

	/** The details Google Contacts' own page shows: account and last import. */
	@Get('connection')
	@UseGuards(AppEnabledGuard)
	public async getConnection(
		@AuthPayload() authPayload: IAuthPayload,
	): Promise<IGoogleContactsConnectionView> {
		const connection: IGoogleContactsConnection | null =
			await this._connectionsService.findByOwner(authPayload._id);

		return {
			connected: connection?.status === AppsEnum.ConnectionStatus.CONNECTED,
			status: connection?.status ?? null,
			googleEmail: connection?.googleEmail ?? null,
			connectedAt: connection?.connectedAt ?? null,
			lastImportAt: connection?.lastImportAt ?? null,
			lastImport: connection?.lastImport ?? null,
		};
	}

	@Post('connect')
	@HttpCode(200)
	@UseGuards(AppEnabledGuard, AppEmployeeLevelGuard)
	public async connect(
		@AuthPayload() authPayload: IAuthPayload,
	): Promise<{ url: string }> {
		return {
			url: await this._googleContactsService.getConnectUrl(
				toContext(authPayload),
			),
		};
	}

	// Public: Google redirects the browser here. Identity comes from the signed
	// `state`, and the service re-checks that the app is still enabled.
	@Public()
	@Get('callback')
	public async callback(
		@Query() query: Record<string, string>,
		@Res() res: Response,
	): Promise<void> {
		const { redirectTo } =
			await this._googleContactsService.handleCallback(query);

		res.redirect(redirectTo);
	}

	@Post('contacts')
	@HttpCode(200)
	@UseGuards(AppEnabledGuard, AppEmployeeLevelGuard)
	public async listContacts(
		@AuthPayload() authPayload: IAuthPayload,
	): Promise<IGoogleContactsPreview> {
		return await this._googleContactsService.listContacts(
			toContext(authPayload),
		);
	}

	@Post('import')
	@HttpCode(200)
	@UseGuards(AppEnabledGuard, AppEmployeeLevelGuard)
	@UsePipes(new ValidationPipe({ transform: true }))
	public async importContacts(
		@AuthPayload() authPayload: IAuthPayload,
		@Body() dto: ImportGoogleContactsDto,
	): Promise<IGoogleContactsImportResponse> {
		return await this._googleContactsService.importSelected(
			toContext(authPayload),
			dto.externalIds,
		);
	}

	@Delete('connection')
	@HttpCode(204)
	@UseGuards(AppEnabledGuard, AppEmployeeLevelGuard)
	public async disconnect(
		@AuthPayload() authPayload: IAuthPayload,
	): Promise<void> {
		await this._googleContactsService.disconnect(toContext(authPayload));
	}
}

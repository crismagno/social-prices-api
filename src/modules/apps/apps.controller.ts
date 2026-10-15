import { Response } from 'express';

import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	Param,
	ParseEnumPipe,
	Post,
	Query,
	Res,
	UseGuards,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';

import { Public } from '../../shared/decorators/custom.decorator';
import { AuthPayload } from '../auth/decorators/current-user.decorator';
import { IAuthPayload } from '../auth/interfaces/auth.types';
import { AppsService } from './apps.service';
import { AppEmployeeLevelGuard } from './guards/app-employee-level.guard';
import { AppEnabledGuard } from './guards/app-enabled.guard';
import AppsEnum from './interfaces/apps.enum';
import ImportAppContactsDto from './interfaces/dto/importAppContacts.dto';
import {
	IAppCatalogItem,
	IAppContext,
	IAppImportResponse,
	IAppSyncPreview,
} from './interfaces/apps.types';

const toContext = (payload: IAuthPayload): IAppContext => ({
	ownerUserId: payload._id,
	employeeId: payload.employeeId ?? null,
});

@Controller('api/v1/apps')
export class AppsController {
	constructor(private readonly _appsService: AppsService) {}

	@Get()
	public async getCatalog(
		@AuthPayload() authPayload: IAuthPayload,
	): Promise<IAppCatalogItem[]> {
		return await this._appsService.getCatalog(authPayload._id);
	}

	@Post(':appId/connect')
	@HttpCode(200)
	@UseGuards(AppEnabledGuard, AppEmployeeLevelGuard)
	public async connect(
		@Param('appId', new ParseEnumPipe(AppsEnum.App)) appId: AppsEnum.App,
		@AuthPayload() authPayload: IAuthPayload,
	): Promise<{ url: string }> {
		return await this._appsService.connect(appId, toContext(authPayload));
	}

	// Public: Google redirects the browser here. Identity comes from the signed
	// `state`, and the integration re-checks that the app is still enabled.
	@Public()
	@Get(':appId/callback')
	public async callback(
		@Param('appId', new ParseEnumPipe(AppsEnum.App)) appId: AppsEnum.App,
		@Query() query: Record<string, string>,
		@Res() res: Response,
	): Promise<void> {
		const { redirectTo } = await this._appsService.handleCallback(appId, query);

		res.redirect(redirectTo);
	}

	@Post(':appId/sync')
	@HttpCode(200)
	@UseGuards(AppEnabledGuard, AppEmployeeLevelGuard)
	public async sync(
		@Param('appId', new ParseEnumPipe(AppsEnum.App)) appId: AppsEnum.App,
		@AuthPayload() authPayload: IAuthPayload,
	): Promise<IAppSyncPreview> {
		return await this._appsService.sync(appId, toContext(authPayload));
	}

	@Post(':appId/import')
	@HttpCode(200)
	@UseGuards(AppEnabledGuard, AppEmployeeLevelGuard)
	@UsePipes(new ValidationPipe({ transform: true }))
	public async importSelected(
		@Param('appId', new ParseEnumPipe(AppsEnum.App)) appId: AppsEnum.App,
		@AuthPayload() authPayload: IAuthPayload,
		@Body() dto: ImportAppContactsDto,
	): Promise<IAppImportResponse> {
		return await this._appsService.importSelected(
			appId,
			toContext(authPayload),
			dto.externalIds,
		);
	}

	@Delete(':appId/connection')
	@HttpCode(204)
	@UseGuards(AppEnabledGuard, AppEmployeeLevelGuard)
	public async disconnect(
		@Param('appId', new ParseEnumPipe(AppsEnum.App)) appId: AppsEnum.App,
		@AuthPayload() authPayload: IAuthPayload,
	): Promise<void> {
		await this._appsService.disconnect(appId, toContext(authPayload));
	}
}

import { Controller, Get } from '@nestjs/common';

import { AuthPayload } from '../auth/decorators/current-user.decorator';
import { IAuthPayload } from '../auth/interfaces/auth.types';
import { AppsService } from './apps.service';
import { IAppCatalogItem } from './interfaces/apps.types';

/** The catalog only. Each app exposes its own routes from its own controller. */
@Controller('api/v1/apps')
export class AppsController {
	constructor(private readonly _appsService: AppsService) {}

	@Get()
	public async getCatalog(
		@AuthPayload() authPayload: IAuthPayload,
	): Promise<IAppCatalogItem[]> {
		return await this._appsService.getCatalog(authPayload._id);
	}
}

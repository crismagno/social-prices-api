import {
	Body,
	Controller,
	Get,
	HttpCode,
	Ip,
	Param,
	Post,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';

import { Public } from '../../shared/decorators/custom.decorator';
import { ValidationParamsPipe } from '../../shared/pipes/validation-params-pipe';
import CreateSiteOrderDto from './interfaces/dto/createSiteOrder.dto';
import { IPublicStoreSite } from './interfaces/store-sites.type';
import { StoreSiteOrdersService } from './store-site-orders.service';
import { StoreSitesPublicService } from './store-sites-public.service';

// Unknown fields are dropped: a price or a total sent by the browser never
// reaches the service.
const validation = new ValidationPipe({ transform: true, whitelist: true });

/** What a visitor of the site reaches, without an account. */
@Controller('api/v1/public/store-sites')
export class StoreSitesPublicController {
	constructor(
		private readonly _storeSitesPublicService: StoreSitesPublicService,
		private readonly _storeSiteOrdersService: StoreSiteOrdersService,
	) {}

	@Public()
	@Get('/:slug')
	public async findBySlug(
		@Param('slug', ValidationParamsPipe) slug: string,
	): Promise<IPublicStoreSite> {
		return await this._storeSitesPublicService.findBySlugOrFail(slug);
	}

	@Public()
	@Post('/:slug/orders')
	@HttpCode(201)
	@UsePipes(validation)
	public async createOrder(
		@Param('slug', ValidationParamsPipe) slug: string,
		@Ip() visitorAddress: string,
		@Body() createSiteOrderDto: CreateSiteOrderDto,
	): Promise<{ number: number }> {
		return await this._storeSiteOrdersService.create(
			slug,
			visitorAddress,
			createSiteOrderDto,
		);
	}
}

import {
	Body,
	Controller,
	Get,
	Param,
	Post,
	Query,
	UseGuards,
} from '@nestjs/common';

import { AllowCustomer } from '../../shared/decorators/custom.decorator';
import {
	ITableStateRequest,
	ITableStateResponse,
} from '../../shared/utils/table/table-state.interface';
import { AuthPayload } from '../auth/decorators/current-user.decorator';
import { IAuthPayload } from '../auth/interfaces/auth.types';
import { ISale } from '../sales/interfaces/sale.interface';
import { IPublicSiteCard } from '../store-sites/interfaces/store-sites.type';
import { StoreSitesPublicService } from '../store-sites/store-sites-public.service';
import { CustomerOnlyGuard } from './customer-only.guard';
import { CustomerPortalService } from './customer-portal.service';
import {
	ICustomerPortalBuyer,
	ICustomerPortalDashboard,
	ICustomerPortalSale,
	ICustomerPortalStore,
} from './interfaces/customer-portal.types';

const buyerOf = (payload: IAuthPayload): ICustomerPortalBuyer => ({
	userId: payload._id,
	email: payload.email,
});

/** The customer account's own area: read-only views of the sales made for them. */
@AllowCustomer()
@UseGuards(CustomerOnlyGuard)
@Controller('api/v1/customer-portal')
export class CustomerPortalController {
	constructor(
		private readonly _customerPortalService: CustomerPortalService,
		private readonly _storeSitesPublicService: StoreSitesPublicService,
	) {}

	@Post('/sales/tableState')
	public async findSales(
		@AuthPayload() authPayload: IAuthPayload,
		@Body() tableState: ITableStateRequest<ISale>,
	): Promise<ITableStateResponse<ICustomerPortalSale[]>> {
		return await this._customerPortalService.findSales(
			buyerOf(authPayload),
			tableState,
		);
	}

	/** The sites that are online, for the customer to visit and buy from. */
	@Get('/sites')
	public async findSites(
		@Query('search') search?: string,
	): Promise<IPublicSiteCard[]> {
		return await this._storeSitesPublicService.findOnlineCards(
			typeof search === 'string' ? search.slice(0, 80) : undefined,
		);
	}

	@Get('/stores')
	public async findStores(
		@AuthPayload() authPayload: IAuthPayload,
	): Promise<ICustomerPortalStore[]> {
		return await this._customerPortalService.findStores(buyerOf(authPayload));
	}

	@Get('/sales/:saleId')
	public async findSale(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('saleId') saleId: string,
	): Promise<ICustomerPortalSale> {
		return await this._customerPortalService.findSale(
			buyerOf(authPayload),
			saleId,
		);
	}

	@Get('/dashboard')
	public async getDashboard(
		@AuthPayload() authPayload: IAuthPayload,
	): Promise<ICustomerPortalDashboard> {
		return await this._customerPortalService.getDashboard(buyerOf(authPayload));
	}
}

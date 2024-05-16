import {
	Body,
	Controller,
	Get,
	Param,
	Post,
	Request,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';

import { ValidationParamsPipe } from '../../shared/pipes/validation-params-pipe';
import {
	ITableStateRequest,
	ITableStateResponse,
} from '../../shared/utils/table/table-state.interface';
import AuthEnum from '../auth/interfaces/auth.enum';
import { IAuthPayload } from '../auth/interfaces/auth.types';
import { ISale } from './interfaces/sale.interface';
import { SalesService } from './sales.service';

@Controller('api/v1/sales')
export class SalesController {
	constructor(private _salesService: SalesService) {}

	@Get('/ownerUserId')
	@UsePipes(ValidationPipe)
	public async findByOwnerUserId(@Request() request: any): Promise<ISale[]> {
		const authPayload: IAuthPayload =
			request[AuthEnum.RequestProps.AUTH_PAYLOAD];

		return await this._salesService.findByOwnerUserId(authPayload._id);
	}

	@Post('/ownerUserTableState')
	@UsePipes(ValidationPipe)
	public async findByOwnerUserTableState(
		@Request() request: any,
		@Body() tableState: ITableStateRequest<ISale>,
	): Promise<ITableStateResponse<ISale[]>> {
		const authPayload: IAuthPayload =
			request[AuthEnum.RequestProps.AUTH_PAYLOAD];

		return await this._salesService.findByOwnerUserTableState(
			authPayload._id,
			tableState,
		);
	}

	@Get('/ownerUser/count')
	@UsePipes(ValidationPipe)
	public async countByOwnerUserId(@Request() request: any): Promise<number> {
		const authPayload: IAuthPayload =
			request[AuthEnum.RequestProps.AUTH_PAYLOAD];

		return await this._salesService.countByOwnerUserId(authPayload._id);
	}

	@Get('/:saleId')
	@UsePipes(ValidationPipe)
	public async findById(
		@Param('saleId', ValidationParamsPipe) saleId: string,
	): Promise<ISale> {
		return await this._salesService.findById(saleId);
	}

	// @Post('/')
	// @UsePipes(ValidationPipe)
	// public async create(
	// 	@Request() request: any,
	// 	@Body() createSaleDto: CreateSaleDto,
	// ): Promise<ISale> {
	// 	const authPayload: IAuthPayload =
	// 		request[AuthEnum.RequestProps.AUTH_PAYLOAD];

	// 	return await this._salesService.create(createSaleDto, authPayload._id);
	// }
}

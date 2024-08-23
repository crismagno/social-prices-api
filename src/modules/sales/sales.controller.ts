import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Post,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';

import { ValidationParamsPipe } from '../../shared/pipes/validation-params-pipe';
import {
	ITableStateRequest,
	ITableStateResponse,
} from '../../shared/utils/table/table-state.interface';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IAuthPayload } from '../auth/interfaces/auth.types';
import CreateSaleDto from './interfaces/dto/createSale.dto';
import UpdateSaleDto from './interfaces/dto/updateSale.dto';
import { ISale } from './interfaces/sale.interface';
import { SalesService } from './sales.service';

@Controller('api/v1/sales')
export class SalesController {
	constructor(private _salesService: SalesService) {}

	@Post('/userTableState')
	@UsePipes(ValidationPipe)
	public async findByUserTableState(
		@CurrentUser() authPayload: IAuthPayload,
		@Body() tableState: ITableStateRequest<ISale>,
	): Promise<ITableStateResponse<ISale[]>> {
		return await this._salesService.findByUserTableState(
			authPayload._id,
			tableState,
		);
	}

	@Get('/user/count')
	@UsePipes(ValidationPipe)
	public async countByUserId(
		@CurrentUser() authPayload: IAuthPayload,
	): Promise<number> {
		return await this._salesService.countByUserId(authPayload._id);
	}

	@Get('/:saleId')
	@UsePipes(ValidationPipe)
	public async findById(
		@Param('saleId', ValidationParamsPipe) saleId: string,
	): Promise<ISale | null> {
		return await this._salesService.findById(saleId);
	}

	@Post('/createManual')
	@UsePipes(ValidationPipe)
	public async createManual(
		@Body() createSaleDto: CreateSaleDto,
	): Promise<ISale> {
		return await this._salesService.createManual(createSaleDto);
	}

	@Post('/updateManual')
	@UsePipes(ValidationPipe)
	public async updateManual(
		@Body() updateSaleDto: UpdateSaleDto,
	): Promise<ISale> {
		return await this._salesService.updateManual(updateSaleDto);
	}

	@Delete('/deleteManual/:saleId')
	@UsePipes(ValidationPipe)
	public async deleteManual(
		@CurrentUser() authPayload: IAuthPayload,
		@Param('saleId', ValidationParamsPipe) saleId: string,
	): Promise<ISale> {
		return await this._salesService.deleteManual(
			saleId,
			authPayload._id,
			authPayload.employeeId,
		);
	}
}

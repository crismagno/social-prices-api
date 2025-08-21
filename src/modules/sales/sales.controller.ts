import { Response } from 'express';

import {
	Body,
	Controller,
	Delete,
	Get,
	InternalServerErrorException,
	Param,
	Post,
	Put,
	Res,
	UploadedFiles,
	UseInterceptors,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';

import { parseFilePipeBuilder } from '../../shared/pipes/parse-file-builder-pipe';
import { ValidationParamsPipe } from '../../shared/pipes/validation-params-pipe';
import {
	ITableStateRequest,
	ITableStateResponse,
} from '../../shared/utils/table/table-state.interface';
import { AuthPayload } from '../auth/decorators/current-user.decorator';
import { IAuthPayload } from '../auth/interfaces/auth.types';
import CreateSaleDto from './interfaces/dto/createSale.dto';
import UpdateSaleDto from './interfaces/dto/updateSale.dto';
import UpdateSaleStatusManualDto from './interfaces/dto/updateSaleStatusManual.dto';
import { ISale } from './interfaces/sale.interface';
import {
	IFiltersDownloadSales,
	IGetSalesAnalyticsParams,
	IGetSalesAnalyticsResponse,
	IGetSalesBalanceParams,
	IGetSalesBalanceResponse,
	IGetSalesSummaryByUserTableStateResponse,
} from './interfaces/sales.type';
import { SalesService } from './sales.service';

@Controller('api/v1/sales')
export class SalesController {
	constructor(private _salesService: SalesService) {}

	@Post('/userTableState')
	@UsePipes(ValidationPipe)
	public async findByUserTableState(
		@AuthPayload() authPayload: IAuthPayload,
		@Body() tableState: ITableStateRequest<ISale>,
	): Promise<ITableStateResponse<ISale[]>> {
		return await this._salesService.findByUserTableState(
			authPayload._id,
			tableState,
		);
	}

	@Post('/getSalesSummaryByUserTableState')
	@UsePipes(ValidationPipe)
	public async getSalesSummaryByUserTableState(
		@AuthPayload() authPayload: IAuthPayload,
		@Body() tableState: ITableStateRequest<ISale>,
	): Promise<IGetSalesSummaryByUserTableStateResponse> {
		return await this._salesService.getSalesSummaryByUserTableState(
			authPayload._id,
			tableState,
		);
	}

	@Get('/user/count')
	@UsePipes(ValidationPipe)
	public async countByUserId(
		@AuthPayload() authPayload: IAuthPayload,
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

	@Put('/updateStatusManual/:saleId')
	@UsePipes(ValidationPipe)
	public async updateStatusManual(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('saleId', ValidationParamsPipe) saleId: string,
		@Body() updateSaleStatusManualDto: UpdateSaleStatusManualDto,
	): Promise<ISale> {
		return await this._salesService.updateStatusManual(
			saleId,
			updateSaleStatusManualDto.newStatus,
			authPayload._id,
			authPayload.employeeId,
		);
	}

	@Delete('/deleteManual/:saleId')
	@UsePipes(ValidationPipe)
	public async deleteManual(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('saleId', ValidationParamsPipe) saleId: string,
	): Promise<ISale> {
		return await this._salesService.deleteManual(
			saleId,
			authPayload._id,
			authPayload.employeeId,
		);
	}

	@Post('/getSalesAnalytics')
	@UsePipes(ValidationPipe)
	public async getSalesAnalytics(
		@AuthPayload() authPayload: IAuthPayload,
		@Body() params: IGetSalesAnalyticsParams,
	): Promise<IGetSalesAnalyticsResponse> {
		return await this._salesService.getSalesAnalytics(authPayload._id, params);
	}

	@Post('/getSalesBalance')
	@UsePipes(ValidationPipe)
	public async getSalesBalance(
		@AuthPayload() authPayload: IAuthPayload,
		@Body() params: IGetSalesBalanceParams,
	): Promise<IGetSalesBalanceResponse> {
		return await this._salesService.getSalesBalance(authPayload._id, params);
	}

	@Post('/uploadSales')
	@UsePipes(ValidationPipe)
	@UseInterceptors(FilesInterceptor('files'))
	public async uploadCustomers(
		@UploadedFiles(parseFilePipeBuilder())
		files: Express.Multer.File[],
		@AuthPayload() authPayload: IAuthPayload,
	): Promise<void> {
		return await this._salesService.uploadSales(
			files,
			authPayload._id,
			authPayload.employeeId,
		);
	}

	@Post('/downloadSales')
	@UsePipes(ValidationPipe)
	public async downloadSales(
		@Res() res: Response,
		@AuthPayload() authPayload: IAuthPayload,
		@Body() filters: IFiltersDownloadSales,
	): Promise<any> {
		const buffer: Buffer = await this._salesService.downloadSales(
			authPayload._id,
			filters,
		);

		if (!buffer) {
			throw new InternalServerErrorException(
				'Error when attempt download sales',
			);
		}

		res.set({
			'Content-Disposition': `attachment; filename=fileDownloadSales.xlsx`,
		});

		res.send(buffer);
	}
}

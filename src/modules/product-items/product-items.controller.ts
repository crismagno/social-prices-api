import { Response } from 'express';

import {
	Body,
	Controller,
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
import CreateProductItemDto from './interfaces/dto/createProductItem.dto';
import UpdateProductItemDto from './interfaces/dto/updateProductItem.dto';
import { IProductItem } from './interfaces/product-item.interface';
import { IFiltersDownloadProductItems } from './interfaces/product-items.type';
import { ProductItemsService } from './product-items.service';

@Controller('api/v1/products')
export class ProductItemsController {
	constructor(private _productItemsService: ProductItemsService) {}

	@Post('/')
	@UsePipes(ValidationPipe)
	@UseInterceptors(FilesInterceptor('files'))
	public async create(
		@UploadedFiles(parseFilePipeBuilder())
		files: Express.Multer.File[],
		@AuthPayload() authPayload: IAuthPayload,
		@Body() createProductItemDto: CreateProductItemDto,
	): Promise<IProductItem> {
		return await this._productItemsService.create(
			files,
			createProductItemDto,
			authPayload._id,
		);
	}

	@Put('/')
	@UsePipes(ValidationPipe)
	@UseInterceptors(FilesInterceptor('files'))
	public async update(
		@UploadedFiles(parseFilePipeBuilder({ build: { fileIsRequired: false } }))
		files: Express.Multer.File[],
		@AuthPayload() authPayload: IAuthPayload,
		@Body() updateProductItemDto: UpdateProductItemDto,
	): Promise<IProductItem> {
		return await this._productItemsService.update(files, updateProductItemDto);
	}

	@Get('/user')
	@UsePipes(ValidationPipe)
	public async findByUserId(
		@AuthPayload() authPayload: IAuthPayload,
	): Promise<IProductItem[]> {
		return await this._productItemsService.findByUserId(authPayload._id);
	}

	@Get('/user/count')
	@UsePipes(ValidationPipe)
	public async countByUserId(
		@AuthPayload() authPayload: IAuthPayload,
	): Promise<number> {
		return await this._productItemsService.countByUserId(authPayload._id);
	}

	@Post('/userTableState')
	@UsePipes(ValidationPipe)
	public async findByUserTableState(
		@AuthPayload() authPayload: IAuthPayload,
		@Body() tableState: ITableStateRequest<IProductItem>,
	): Promise<ITableStateResponse<IProductItem[]>> {
		return await this._productItemsService.findByUserTableState(
			authPayload._id,
			tableState,
		);
	}

	@Post('/findByIds')
	@UsePipes(ValidationPipe)
	public async findByIds(
		@Body() productItemsIds: string[],
	): Promise<IProductItem[]> {
		return await this._productItemsService.findByIds(productItemsIds);
	}

	@Get('/:productItemId')
	@UsePipes(ValidationPipe)
	public async findById(
		@Param('productItemId', ValidationParamsPipe) productItemId: string,
	): Promise<IProductItem | null> {
		return await this._productItemsService.findById(productItemId);
	}

	@Post('/uploadProductItems')
	@UsePipes(ValidationPipe)
	@UseInterceptors(FilesInterceptor('files'))
	public async uploadProductItems(
		@UploadedFiles(parseFilePipeBuilder({ allowOnlyTypes: ['spreadsheet'] }))
		files: Express.Multer.File[],
		@AuthPayload() authPayload: IAuthPayload,
	): Promise<void> {
		return await this._productItemsService.uploadProductItems(
			files,
			authPayload._id,
			authPayload.employeeId,
		);
	}

	@Post('/downloadProductItems')
	@UsePipes(ValidationPipe)
	public async downloadProductItems(
		@Res() res: Response,
		@AuthPayload() authPayload: IAuthPayload,
		@Body() filters: IFiltersDownloadProductItems,
	): Promise<any> {
		const buffer: Buffer = await this._productItemsService.downloadProductItems(
			authPayload._id,
			filters,
		);

		if (!buffer) {
			throw new InternalServerErrorException(
				'Error when attempt download product items',
			);
		}

		res.set({
			'Content-Disposition': `attachment; filename=fileDownloadProductItems.xlsx`,
		});

		res.send(buffer);
	}
}

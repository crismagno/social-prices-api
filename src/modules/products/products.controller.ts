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
import CreateProductDto from './interfaces/dto/createProduct.dto';
import UpdateProductDto from './interfaces/dto/updateProduct.dto';
import { IProduct } from './interfaces/product.interface';
import { IFiltersDownloadProducts } from './interfaces/products.type';
import { ProductsService } from './products.service';

@Controller('api/v1/products')
export class ProductsController {
	constructor(private _productsService: ProductsService) {}

	@Post('/')
	@UsePipes(ValidationPipe)
	@UseInterceptors(FilesInterceptor('files'))
	public async create(
		@UploadedFiles(parseFilePipeBuilder())
		files: Express.Multer.File[],
		@AuthPayload() authPayload: IAuthPayload,
		@Body() createProductDto: CreateProductDto,
	): Promise<IProduct> {
		return await this._productsService.create(
			files,
			createProductDto,
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
		@Body() updateProductDto: UpdateProductDto,
	): Promise<IProduct> {
		return await this._productsService.update(
			files,
			updateProductDto,
			authPayload._id,
		);
	}

	@Get('/user')
	@UsePipes(ValidationPipe)
	public async findByUserId(
		@AuthPayload() authPayload: IAuthPayload,
	): Promise<IProduct[]> {
		return await this._productsService.findByUserId(authPayload._id);
	}

	@Get('/user/count')
	@UsePipes(ValidationPipe)
	public async countByUserId(
		@AuthPayload() authPayload: IAuthPayload,
	): Promise<number> {
		return await this._productsService.countByUserId(authPayload._id);
	}

	@Post('/userTableState')
	@UsePipes(ValidationPipe)
	public async findByUserTableState(
		@AuthPayload() authPayload: IAuthPayload,
		@Body() tableState: ITableStateRequest<IProduct>,
	): Promise<ITableStateResponse<IProduct[]>> {
		return await this._productsService.findByUserTableState(
			authPayload._id,
			tableState,
		);
	}

	@Post('/findByIds')
	@UsePipes(ValidationPipe)
	public async findByIds(@Body() productIds: string[]): Promise<IProduct[]> {
		return await this._productsService.findByIds(productIds);
	}

	@Get('/:productId')
	@UsePipes(ValidationPipe)
	public async findById(
		@Param('productId', ValidationParamsPipe) productId: string,
	): Promise<IProduct | null> {
		return await this._productsService.findById(productId);
	}

	@Post('/uploadProducts')
	@UsePipes(ValidationPipe)
	@UseInterceptors(FilesInterceptor('files'))
	public async uploadProducts(
		@UploadedFiles(parseFilePipeBuilder())
		files: Express.Multer.File[],
		@AuthPayload() authPayload: IAuthPayload,
	): Promise<void> {
		return await this._productsService.uploadProducts(
			files,
			authPayload._id,
			authPayload.employeeId,
		);
	}

	@Post('/downloadProducts')
	@UsePipes(ValidationPipe)
	public async downloadProducts(
		@Res() res: Response,
		@AuthPayload() authPayload: IAuthPayload,
		@Body() filters: IFiltersDownloadProducts,
	): Promise<any> {
		const buffer: Buffer = await this._productsService.downloadProducts(
			authPayload._id,
			filters,
		);

		if (!buffer) {
			throw new InternalServerErrorException(
				'Error when attempt download products',
			);
		}

		res.set({
			'Content-Disposition': `attachment; filename=fileDownloadProducts.xlsx`,
		});

		res.send(buffer);
	}
}

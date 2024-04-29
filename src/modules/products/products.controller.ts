import {
	Body,
	Controller,
	Get,
	Param,
	Post,
	Put,
	Request,
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
import AuthEnum from '../auth/interfaces/auth.enum';
import { IAuthPayload } from '../auth/interfaces/auth.types';
import CreateProductDto from './interfaces/dto/createProduct.dto';
import UpdateProductDto from './interfaces/dto/updateProduct.dto';
import { IProduct } from './interfaces/product.interface';
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
		@Request() request: any,
		@Body() createProductDto: CreateProductDto,
	): Promise<IProduct> {
		const authPayload: IAuthPayload =
			request[AuthEnum.RequestProps.AUTH_PAYLOAD];

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
		@Request() request: any,
		@Body() updateProductDto: UpdateProductDto,
	): Promise<IProduct> {
		const authPayload: IAuthPayload =
			request[AuthEnum.RequestProps.AUTH_PAYLOAD];

		return await this._productsService.update(
			files,
			updateProductDto,
			authPayload._id,
		);
	}

	@Get('/user')
	@UsePipes(ValidationPipe)
	public async findByUserId(@Request() request: any): Promise<IProduct[]> {
		const authPayload: IAuthPayload =
			request[AuthEnum.RequestProps.AUTH_PAYLOAD];

		return await this._productsService.findByUserId(authPayload._id);
	}

	@Post('/userTableState')
	@UsePipes(ValidationPipe)
	public async findByUserTableState(
		@Request() request: any,
		@Body() tableState: ITableStateRequest<IProduct>,
	): Promise<ITableStateResponse<IProduct[]>> {
		const authPayload: IAuthPayload =
			request[AuthEnum.RequestProps.AUTH_PAYLOAD];

		return await this._productsService.findByUserTableState(
			authPayload._id,
			tableState,
		);
	}

	@Get('/:productId')
	@UsePipes(ValidationPipe)
	public async findById(
		@Param('productId', ValidationParamsPipe) productId: string,
	): Promise<IProduct> {
		return await this._productsService.findById(productId);
	}
}

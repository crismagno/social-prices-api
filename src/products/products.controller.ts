import {
	Body,
	Controller,
	Get,
	HttpStatus,
	Param,
	ParseFilePipeBuilder,
	Post,
	Put,
	Request,
	UploadedFiles,
	UseInterceptors,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';

import AuthEnum from '../auth/interfaces/auth.enum';
import { IAuthPayload } from '../auth/interfaces/auth.types';
import {
	ITableStateRequest,
	ITableStateResponse,
} from '../shared/helpers/table/table-state.interface';
import { ValidationParamsPipe } from '../shared/pipes/validation-params-pipe';
import CreateProductDto from './interfaces/dto/createProduct.dto';
import UpdateProductDto from './interfaces/dto/updateProduct.dto';
import { IProduct } from './interfaces/products.interface';
import { ProductsService } from './products.service';

@Controller('api/v1/products')
export class ProductsController {
	constructor(private _productsService: ProductsService) {}

	@Post('/')
	@UsePipes(ValidationPipe)
	@UseInterceptors(FilesInterceptor('files'))
	public async create(
		@UploadedFiles(
			new ParseFilePipeBuilder()
				.addFileTypeValidator({
					fileType: /(jpg|jpeg|png|gif)$/,
				})
				.addMaxSizeValidator({
					maxSize: 5242880,
				})
				.build({
					errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
				}),
		)
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
		@UploadedFiles(
			new ParseFilePipeBuilder()
				.addFileTypeValidator({
					fileType: /(jpg|jpeg|png|gif)$/,
				})
				.addMaxSizeValidator({
					maxSize: 5242880,
				})
				.build({
					errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
				}),
		)
		files: Express.Multer.File[],
		@Request() request: any,
		@Body() updateProductDto: UpdateProductDto,
	): Promise<IProduct> {
		const authPayload: IAuthPayload =
			request[AuthEnum.RequestProps.AUTH_PAYLOAD];

		return await this._productsService.create(
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

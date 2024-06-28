import {
	Body,
	Controller,
	Get,
	Param,
	Post,
	Put,
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
import { CategoriesService } from './categories.service';
import CategoriesEnum from './interfaces/categories.enum';
import { ICategory } from './interfaces/category.interface';
import CreateCategoryDto from './interfaces/dto/createCategory.dto';
import CreateCategoryMultiDto from './interfaces/dto/createCategoryMulti.dto';
import UpdateCategoryDto from './interfaces/dto/updateCategory.dto';

@Controller('api/v1/categories')
export class CategoriesController {
	constructor(private _categoriesService: CategoriesService) {}

	@Post('/userTableState')
	@UsePipes(ValidationPipe)
	public async findByUserTableState(
		@Request() request: any,
		@Body() tableState: ITableStateRequest<ICategory>,
	): Promise<ITableStateResponse<ICategory[]>> {
		const authPayload: IAuthPayload =
			request[AuthEnum.RequestProps.AUTH_PAYLOAD];

		return await this._categoriesService.findByUserTableState(
			authPayload._id,
			tableState,
		);
	}

	@Get('type/:type')
	public async findByType(
		@Request() request: any,
		@Param('type', ValidationParamsPipe) type: CategoriesEnum.Type,
	): Promise<ICategory[]> {
		const authPayload: IAuthPayload =
			request[AuthEnum.RequestProps.AUTH_PAYLOAD];

		return await this._categoriesService.findByType(type, authPayload._id);
	}

	@Get('/user/count')
	public async countByUserId(@Request() request: any): Promise<number> {
		const authPayload: IAuthPayload =
			request[AuthEnum.RequestProps.AUTH_PAYLOAD];

		return await this._categoriesService.countByUserId(authPayload._id);
	}

	@Get('/:categoryId')
	public async findById(
		@Param('categoryId', ValidationParamsPipe) categoryId: string,
	): Promise<ICategory | null> {
		return await this._categoriesService.findById(categoryId);
	}

	@Post('/')
	@UsePipes(ValidationPipe)
	public async create(
		@Request() request: any,
		@Body() createCategoryDto: CreateCategoryDto,
	): Promise<ICategory> {
		const authPayload: IAuthPayload =
			request[AuthEnum.RequestProps.AUTH_PAYLOAD];

		return await this._categoriesService.create(
			createCategoryDto,
			authPayload._id,
		);
	}

	@Put('/')
	@UsePipes(ValidationPipe)
	public async update(
		@Request() request: any,
		@Body() updateCategoryDto: UpdateCategoryDto,
	): Promise<ICategory> {
		const authPayload: IAuthPayload =
			request[AuthEnum.RequestProps.AUTH_PAYLOAD];

		return await this._categoriesService.update(
			updateCategoryDto,
			authPayload._id,
		);
	}

	@Post('/multi')
	@UsePipes(ValidationPipe)
	public async createMulti(
		@Request() request: any,
		@Body() createCategoriesDto: CreateCategoryMultiDto,
	): Promise<void> {
		const authPayload: IAuthPayload =
			request[AuthEnum.RequestProps.AUTH_PAYLOAD];

		await this._categoriesService.createMulti(
			createCategoriesDto,
			authPayload._id,
		);
	}
}

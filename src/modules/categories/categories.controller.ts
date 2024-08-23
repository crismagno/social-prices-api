import {
	Body,
	Controller,
	Get,
	Param,
	Post,
	Put,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';

import { ValidationParamsPipe } from '../../shared/pipes/validation-params-pipe';
import {
	ITableStateRequest,
	ITableStateResponse,
} from '../../shared/utils/table/table-state.interface';
import { AuthPayload } from '../auth/decorators/current-user.decorator';
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
		@AuthPayload() authPayload: IAuthPayload,
		@Body() tableState: ITableStateRequest<ICategory>,
	): Promise<ITableStateResponse<ICategory[]>> {
		return await this._categoriesService.findByUserTableState(
			authPayload._id,
			tableState,
		);
	}

	@Get('type/:type')
	public async findByType(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('type', ValidationParamsPipe) type: CategoriesEnum.Type,
	): Promise<ICategory[]> {
		return await this._categoriesService.findByType(type, authPayload._id);
	}

	@Get('/user/count')
	public async countByUserId(
		@AuthPayload() authPayload: IAuthPayload,
	): Promise<number> {
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
		@AuthPayload() authPayload: IAuthPayload,
		@Body() createCategoryDto: CreateCategoryDto,
	): Promise<ICategory> {
		return await this._categoriesService.create(
			createCategoryDto,
			authPayload._id,
		);
	}

	@Put('/')
	@UsePipes(ValidationPipe)
	public async update(
		@AuthPayload() authPayload: IAuthPayload,
		@Body() updateCategoryDto: UpdateCategoryDto,
	): Promise<ICategory> {
		return await this._categoriesService.update(
			updateCategoryDto,
			authPayload._id,
		);
	}

	@Post('/multi')
	@UsePipes(ValidationPipe)
	public async createMulti(
		@AuthPayload() authPayload: IAuthPayload,
		@Body() createCategoriesDto: CreateCategoryMultiDto,
	): Promise<void> {
		await this._categoriesService.createMulti(
			createCategoriesDto,
			authPayload._id,
		);
	}
}

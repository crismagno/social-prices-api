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

	@Get('/:type')
	public async getByType(
		@Param('type', ValidationParamsPipe) type: CategoriesEnum.Type,
	): Promise<ICategory[]> {
		return await this._categoriesService.findByType(type);
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
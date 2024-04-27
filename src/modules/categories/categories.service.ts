import { Model } from 'mongoose';

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { schemasName } from '../../infra/database/mongo/schemas';
import { UsersService } from '../users/users.service';
import CategoriesEnum from './interfaces/categories.enum';
import { ICategory } from './interfaces/category.interface';
import { Category } from './interfaces/category.schema';
import CreateCategoryDto from './interfaces/dto/createCategory.dto';
import CreateCategoryMultiDto from './interfaces/dto/createCategoryMulti.dto';
import UpdateCategoryDto from './interfaces/dto/updateCategory.dto';

@Injectable()
export class CategoriesService {
	// #region Private Properties

	private readonly _logger: Logger;

	// #endregion

	// #region Constructor

	constructor(
		@InjectModel(schemasName.category)
		private readonly _categoryModel: Model<Category>,
		private readonly _usersService: UsersService,
	) {
		this._logger = new Logger(CategoriesService.name);
	}

	// #endregion

	// #region Public Methods

	public async findByType(type: CategoriesEnum.Type): Promise<ICategory[]> {
		return this._categoryModel.find({ type });
	}

	public async create(
		createCategoryDto: CreateCategoryDto,
		userId: string,
	): Promise<ICategory> {
		await this._usersService.findOneByUserIdOrFail(userId);

		const now: Date = new Date();

		const category = new this._categoryModel({
			name: createCategoryDto.name,
			code: createCategoryDto.code,
			type: createCategoryDto.type,
			userId,
			createdAt: now,
			updatedAt: now,
		});

		const newCategory: ICategory = await category.save();

		return newCategory;
	}

	public async update(
		updateCategoryDto: UpdateCategoryDto,
		userId: string,
	): Promise<ICategory> {
		await this._usersService.findOneByUserIdOrFail(userId);

		const categoryUpdated: ICategory =
			await this._categoryModel.findByIdAndUpdate(
				updateCategoryDto.categoryId,
				{
					$set: {
						name: updateCategoryDto.name,
						code: updateCategoryDto.code,
						type: updateCategoryDto.type,
						userId,
					},
				},
				{
					new: true,
				},
			);

		return categoryUpdated;
	}

	public async createMulti(
		createCategoriesDto: CreateCategoryMultiDto,
		userId: string,
	): Promise<void> {
		await this._usersService.findOneByUserIdOrFail(userId);

		const now: Date = new Date();

		const categoriesToCreate = createCategoriesDto.categories.map(
			(category: CreateCategoryDto) => ({
				...category,
				userId,
				createdAt: now,
				updatedAt: now,
			}),
		);

		await this._categoryModel.create(categoriesToCreate);
	}

	// #endregion
}

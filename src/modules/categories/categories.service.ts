import { FilterQuery, Model } from 'mongoose';

import {
	BadRequestException,
	Injectable,
	Logger,
	NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { schemasName } from '../../infra/database/mongo/schemas';
import { queryOptions } from '../../shared/utils/table/table-state';
import {
	ITableStateRequest,
	ITableStateResponse,
} from '../../shared/utils/table/table-state.interface';
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

	public async findById(categoryId: string): Promise<ICategory | undefined> {
		return this._categoryModel.findById(categoryId);
	}

	public async countByUserId(userId: string): Promise<number> {
		return this._categoryModel.countDocuments({
			ownerUserId: userId,
		});
	}

	public async findByIdOrFail(categoryId: string): Promise<ICategory> {
		const category: ICategory | undefined = await this.findById(categoryId);

		if (!category) {
			throw new NotFoundException('Category not found!');
		}

		return category;
	}

	public async findByOwnerUserIdTypeName(
		ownerUserId: string,
		type: CategoriesEnum.Type,
		name: string,
	): Promise<ICategory | undefined> {
		return this._categoryModel.findOne({
			ownerUserId,
			type,
			name,
		});
	}

	public async validateCreateOrUpdate(
		ownerUserId: string,
		type: CategoriesEnum.Type,
		name: string,
		categoryId?: string,
	): Promise<void> {
		const category: ICategory | undefined =
			await this.findByOwnerUserIdTypeName(ownerUserId, type, name);

		if (!category) {
			return;
		}

		if (category._id.toString() === categoryId) {
			return;
		}

		throw new BadRequestException(
			`Already exists a category by same type "${CategoriesEnum.TypeLabels[type]}" and name: ${name}`,
		);
	}

	public async findByUserTableState(
		userId: string,
		tableState: ITableStateRequest<ICategory>,
	): Promise<ITableStateResponse<ICategory[]>> {
		const filter: FilterQuery<ICategory> = {
			ownerUserId: userId,
		};

		if (tableState.search) {
			const search = new RegExp(tableState.search, 'ig');

			filter.$or = [{ name: search }, { description: search }];
		}

		if (tableState.filters?.type?.length) {
			filter.type = { $in: tableState.filters.type as CategoriesEnum.Type[] };
		}

		const response: ITableStateResponse<ICategory[]> = {
			data: [],
			total: 0,
		};

		response.total = await this._categoryModel.countDocuments(filter);
		response.data = await this._categoryModel.find(
			filter,
			null,
			queryOptions<ICategory>(tableState),
		);

		return response;
	}

	public async findByType(
		type: CategoriesEnum.Type,
		userId: string,
	): Promise<ICategory[]> {
		return this._categoryModel.find({
			type,
			ownerUserId: { $in: [null, userId] },
		});
	}

	public async create(
		createCategoryDto: CreateCategoryDto,
		userId: string,
	): Promise<ICategory> {
		await this._usersService.findOneByUserIdOrFail(userId);

		const now: Date = new Date();

		await this.validateCreateOrUpdate(
			createCategoryDto.ownerUserId,
			createCategoryDto.type,
			createCategoryDto.name,
		);

		const category = new this._categoryModel({
			name: createCategoryDto.name,
			code: createCategoryDto.code,
			type: createCategoryDto.type,
			createdByUserId: userId,
			ownerUserId: createCategoryDto.ownerUserId,
			description: createCategoryDto.description,
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

		await this.validateCreateOrUpdate(
			updateCategoryDto.ownerUserId,
			updateCategoryDto.type,
			updateCategoryDto.name,
			updateCategoryDto.categoryId,
		);

		const categoryUpdated: ICategory =
			await this._categoryModel.findByIdAndUpdate(
				updateCategoryDto.categoryId,
				{
					$set: {
						name: updateCategoryDto.name,
						code: updateCategoryDto.code,
						type: updateCategoryDto.type,
						description: updateCategoryDto.description,
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

		const categoriesToCreate = await Promise.all(
			createCategoriesDto.categories.map(
				async (category: CreateCategoryDto) => {
					await this.validateCreateOrUpdate(
						category.ownerUserId,
						category.type,
						category.name,
					);

					return {
						...category,
						createdByUserId: userId,
						createdAt: now,
						updatedAt: now,
					};
				},
			),
		);

		await this._categoryModel.create(categoriesToCreate);
	}

	// #endregion
}

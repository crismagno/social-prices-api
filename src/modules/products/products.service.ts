import { FilterQuery, Model } from 'mongoose';

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { schemasName } from '../../infra/database/mongo/schemas';
import { AmazonFilesService } from '../../infra/services/amazon/amazon-files-service';
import { queryOptions } from '../../shared/helpers/table/table-state';
import {
	ITableStateRequest,
	ITableStateResponse,
} from '../../shared/helpers/table/table-state.interface';
import { UsersService } from '../users/users.service';
import CreateProductDto from './interfaces/dto/createProduct.dto';
import UpdateProductDto from './interfaces/dto/updateProduct.dto';
import { IProduct } from './interfaces/product.interface';
import { Product } from './interfaces/product.schema';

@Injectable()
export class ProductsService {
	// #region Private Properties

	private readonly _logger: Logger;

	// #endregion

	// #region Constructor

	constructor(
		@InjectModel(schemasName.product)
		private readonly _productModel: Model<Product>,
		private readonly _usersService: UsersService,
		private readonly _amazonFilesService: AmazonFilesService,
	) {
		this._logger = new Logger(ProductsService.name);
	}

	// #endregion

	// #region Public Methods

	public async findById(productId: string): Promise<IProduct | undefined> {
		return this._productModel.findById(productId);
	}

	public async findByIdOrFail(productId: string): Promise<IProduct> {
		const product: IProduct | undefined = await this.findById(productId);

		if (!product) {
			throw new NotFoundException('Product not found!');
		}

		return product;
	}

	public async findByUserId(userId: string): Promise<IProduct[]> {
		const products: IProduct[] = await this._productModel.find({ userId });

		return products;
	}

	public async findByUserTableState(
		userId: string,
		tableState: ITableStateRequest<IProduct>,
	): Promise<ITableStateResponse<IProduct[]>> {
		const filter: FilterQuery<IProduct> = {
			userId,
		};

		if (tableState.search) {
			const search = new RegExp(tableState.search, 'ig');

			filter.$or = [
				{
					name: search,
				},
				{
					description: search,
				},
				{
					barCode: search,
				},
			];
		}

		if (tableState.filters?.isActive?.length === 1) {
			filter.isActive = tableState.filters?.isActive[0];
		}

		if (tableState.filters?.storeIds?.length) {
			filter.storeIds = { $in: tableState.filters?.storeIds as string[] };
		}

		const response: ITableStateResponse<IProduct[]> = {
			data: [],
			total: 0,
		};

		response.total = await this._productModel.countDocuments(filter);
		response.data = await this._productModel.find(
			filter,
			null,
			queryOptions<IProduct>(tableState),
		);

		return response;
	}

	public async create(
		files: Express.Multer.File[],
		createProductDto: CreateProductDto,
		userId: string,
	): Promise<IProduct> {
		await this._usersService.findOneByUserIdOrFail(userId);

		const filesUrl: string[] =
			await this._amazonFilesService.getUploadFilesUrl(files);

		const now: Date = new Date();

		if (typeof createProductDto.storeIds === 'string') {
			createProductDto.storeIds = JSON.parse(createProductDto.storeIds);
		}

		const product = new this._productModel({
			createdAt: now,
			description: createProductDto.description,
			filesUrl,
			isActive: createProductDto.isActive,
			name: createProductDto.name,
			price: createProductDto.price,
			quantity: createProductDto.quantity,
			details: createProductDto.details,
			storeIds: createProductDto.storeIds,
			updatedAt: now,
			userId,
			mainUrl: filesUrl?.[0] ?? null,
			barCode: createProductDto.barCode,
		});

		const newProduct: IProduct = await product.save();

		return newProduct;
	}

	public async update(
		files: Express.Multer.File[],
		updateProductDto: UpdateProductDto,
		userId: string,
	): Promise<IProduct> {
		await this._usersService.findOneByUserIdOrFail(userId);

		const product: IProduct = await this.findByIdOrFail(
			updateProductDto.productId,
		);

		const filesUrl: string[] =
			await this._amazonFilesService.getUploadFilesUrl(files);

		const now: Date = new Date();

		const productUpdated = await this._productModel.findByIdAndUpdate(
			product._id,
			{
				$set: {
					description: updateProductDto.description,
					filesUrl,
					isActive: updateProductDto.isActive,
					name: updateProductDto.name,
					price: updateProductDto.price,
					quantity: updateProductDto.quantity,
					details: updateProductDto.details,
					storeIds: updateProductDto.storeIds,
					barCode: updateProductDto.barCode,
					updatedAt: now,
				},
			},
		);

		return productUpdated;
	}

	// #endregion
}

import { FilterQuery, Model } from 'mongoose';

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { schemasName } from '../../infra/database/mongo/schemas';
import { AmazonFilesService } from '../../infra/services/amazon/amazon-files-service';
import { createUniqueSuffix } from '../../shared/helpers/global';
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

		if (typeof createProductDto.categoriesCode === 'string') {
			createProductDto.categoriesCode = JSON.parse(
				createProductDto.categoriesCode,
			);
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
			categoriesCode: createProductDto.categoriesCode,
			updatedAt: now,
			userId,
			mainUrl: filesUrl?.[0] ?? null,
			barCode: createProductDto.barCode || createUniqueSuffix(),
			QRCode: createProductDto.QRCode,
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

		if (typeof updateProductDto.deletedFilesUrl === 'string') {
			updateProductDto.deletedFilesUrl = JSON.parse(
				updateProductDto.deletedFilesUrl,
			);

			if (updateProductDto.deletedFilesUrl.length) {
				await this._amazonFilesService.deleteFiles(
					updateProductDto.deletedFilesUrl,
				);
			}
		}

		if (typeof updateProductDto.storeIds === 'string') {
			updateProductDto.storeIds = JSON.parse(updateProductDto.storeIds);
		}

		if (typeof updateProductDto.categoriesCode === 'string') {
			updateProductDto.categoriesCode = JSON.parse(
				updateProductDto.categoriesCode,
			);
		}

		const filesUrl: string[] =
			await this._amazonFilesService.getUploadFilesUrl(files);

		const now: Date = new Date();

		product.filesUrl = product.filesUrl.filter(
			(fileUrl: string) =>
				!updateProductDto.deletedFilesUrl.find(
					(deletedFileUrl: string) => deletedFileUrl === fileUrl,
				),
		);

		product.filesUrl.push(...filesUrl);

		const productUpdated = await this._productModel.findByIdAndUpdate(
			product._id,
			{
				$set: {
					filesUrl: product.filesUrl,
					description: updateProductDto.description,
					isActive: updateProductDto.isActive,
					name: updateProductDto.name,
					price: updateProductDto.price,
					quantity: updateProductDto.quantity,
					details: updateProductDto.details,
					storeIds: updateProductDto.storeIds,
					categoriesCode: updateProductDto.categoriesCode,
					barCode: updateProductDto.barCode || createUniqueSuffix(),
					updatedAt: now,
					mainUrl: product.filesUrl?.[0] ?? null,
					QRCode: updateProductDto.QRCode,
				},
			},
		);

		return productUpdated;
	}

	// #endregion
}
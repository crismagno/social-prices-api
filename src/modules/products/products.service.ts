import {
	FilterQuery,
	Model,
	QueryOptions,
	UpdateQuery,
	UpdateWithAggregationPipeline,
} from 'mongoose';

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { schemasName } from '../../infra/database/mongo/schemas';
import { valueOrCreateUniqueSuffix } from '../../shared/utils/global/global';
import { queryOptions } from '../../shared/utils/table/table-state';
import {
	ITableStateRequest,
	ITableStateResponse,
} from '../../shared/utils/table/table-state.interface';
import { FilesService } from '../files/files-service';
import { NotificationsService } from '../notifications/notifications.service';
import { IUser } from '../users/interfaces/user.interface';
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
		private readonly _filesService: FilesService,
		private readonly _notificationsService: NotificationsService,
	) {
		this._logger = new Logger(ProductsService.name);
	}

	// #endregion

	// #region Public Methods

	public async findById(productId: string): Promise<IProduct | null> {
		return this._productModel.findById(productId);
	}

	public async findByIds(productIds: string[]): Promise<IProduct[]> {
		return this._productModel.find({ _id: { $in: productIds } });
	}

	public async findByIdOrFail(productId: string): Promise<IProduct> {
		const product: IProduct | null = await this.findById(productId);

		if (!product) {
			throw new NotFoundException('Product not found!');
		}

		return product;
	}

	public async findByUserId(userId: string): Promise<IProduct[]> {
		return await this._productModel.find({ userId });
	}

	public async countByUserId(userId: string): Promise<number> {
		return await this._productModel.countDocuments({
			userId,
		});
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
			filter.isActive = tableState.filters.isActive[0];
		}

		if (tableState.filters?.storeIds?.length) {
			filter.storeIds = { $in: tableState.filters.storeIds as string[] };
		}

		if (tableState?.filters?.categoriesIds?.length) {
			filter.categoriesIds = { $in: tableState.filters.categoriesIds };
		}

		if (tableState?.filters?.tagsIds?.length) {
			filter.tagsIds = { $in: tableState.filters.tagsIds };
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
		const user: IUser = await this._usersService.findOneByIdOrFail(userId);

		const filesUrl: string[] =
			await this._filesService.getUploadFilesUrl(files);

		if (typeof createProductDto.storeIds === 'string') {
			createProductDto.storeIds = JSON.parse(createProductDto.storeIds);
		}

		if (typeof createProductDto.categoriesIds === 'string') {
			createProductDto.categoriesIds = JSON.parse(
				createProductDto.categoriesIds,
			);
		}

		if (typeof createProductDto.tagsIds === 'string') {
			createProductDto.tagsIds = JSON.parse(createProductDto.tagsIds);
		}

		const now: Date = new Date();

		const product = new this._productModel({
			description: createProductDto.description,
			filesUrl,
			isActive: createProductDto.isActive,
			name: createProductDto.name,
			price: createProductDto.price,
			quantity: createProductDto.quantity,
			details: createProductDto.details,
			storeIds: createProductDto.storeIds,
			categoriesIds: createProductDto.categoriesIds,
			tagsIds: createProductDto.tagsIds,
			userId,
			mainUrl: filesUrl?.[0] ?? null,
			barCode: valueOrCreateUniqueSuffix(createProductDto.barCode),
			QRCode: createProductDto.QRCode,
			createdAt: now,
			updatedAt: now,
		});

		const newProduct: IProduct = await product.save();

		await this._notificationsService.createdProduct(user, product);

		return newProduct;
	}

	public async update(
		files: Express.Multer.File[],
		updateProductDto: UpdateProductDto,
		userId: string,
	): Promise<IProduct> {
		const user: IUser = await this._usersService.findOneByIdOrFail(userId);

		const product: IProduct = await this.findByIdOrFail(
			updateProductDto.productId,
		);

		if (typeof updateProductDto.deletedFilesUrl === 'string') {
			updateProductDto.deletedFilesUrl = JSON.parse(
				updateProductDto.deletedFilesUrl,
			);

			if (updateProductDto.deletedFilesUrl.length) {
				await this._filesService.deleteFiles(updateProductDto.deletedFilesUrl);
			}
		}

		if (typeof updateProductDto.storeIds === 'string') {
			updateProductDto.storeIds = JSON.parse(updateProductDto.storeIds);
		}

		if (typeof updateProductDto.categoriesIds === 'string') {
			updateProductDto.categoriesIds = JSON.parse(
				updateProductDto.categoriesIds,
			);
		}

		if (typeof updateProductDto.tagsIds === 'string') {
			updateProductDto.tagsIds = JSON.parse(updateProductDto.tagsIds);
		}

		const filesUrl: string[] =
			await this._filesService.getUploadFilesUrl(files);

		product.filesUrl = product.filesUrl.filter(
			(fileUrl: string) =>
				!updateProductDto.deletedFilesUrl.find(
					(deletedFileUrl: string) => deletedFileUrl === fileUrl,
				),
		);

		product.filesUrl.push(...filesUrl);

		const now: Date = new Date();

		const productUpdated: IProduct = await this._productModel.findByIdAndUpdate(
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
					categoriesIds: updateProductDto.categoriesIds,
					tagsIds: updateProductDto.tagsIds,
					barCode: valueOrCreateUniqueSuffix(updateProductDto.barCode),
					mainUrl: product.filesUrl?.[0] ?? null,
					QRCode: updateProductDto.QRCode,
					updatedAt: now,
				},
			},
		);

		await this._notificationsService.updatedProduct(user, productUpdated);

		return productUpdated;
	}

	public async updateOne(
		filter?: FilterQuery<Product>,
		update?: UpdateWithAggregationPipeline | UpdateQuery<IProduct>,
		options?: QueryOptions<IProduct>,
	): Promise<IProduct | null> {
		return this._productModel.findOneAndUpdate(filter, update, options);
	}

	public async uploadProducts(
		files: Express.Multer.File[],
		userId: string,
		employeeId: string,
	): Promise<void> {
		// const hasUploadCustomersProcessing: boolean =
		// 	await this._filesUploadsService.hasUploadCustomersProcessingByUserId(
		// 		userId,
		// 	);
		// if (hasUploadCustomersProcessing) {
		// 	throw new InternalServerErrorException(
		// 		'In the moment you have upload customers files processing. please wait finish to try upload new files.',
		// 	);
		// }
		// const tags: ITag[] = await this._tagsService.findByType(
		// 	userId,
		// 	TagsEnum.Type.CUSTOMER,
		// );
		// const now: Date = new Date();
		// this._filesService
		// 	.getUploadFilesUrl(files)
		// 	.then(async (filenames: string[]) => {
		// 		const filesUploads: IFileUpload[] =
		// 			await this._filesUploadsService.createMulti({
		// 				employeeId,
		// 				filenames,
		// 				type: FilesUploadsEnum.Type.UPLOAD_CUSTOMERS,
		// 				userId,
		// 			});
		// 		const fileUploadTemplateErrors: IFileUploadTemplateError<ICustomerFileUploadTemplateRow>[] =
		// 			[];
		// 		for await (const [
		// 			index,
		// 			{ filename, _id: fileUploadId },
		// 		] of filesUploads.entries()) {
		// 			await this._filesUploadsService.findByIdAndUpdate(fileUploadId, {
		// 				$set: {
		// 					status: FilesUploadsEnum.Status.PROCESSING,
		// 					updatedAt: new Date(),
		// 				},
		// 			});
		// 			const fileUploadTemplateError: IFileUploadTemplateError<ICustomerFileUploadTemplateRow> =
		// 				{
		// 					filename,
		// 					fileNumber: index + 1,
		// 					rowsError: [],
		// 					processError: undefined,
		// 					fileColumns: {
		// 						rowNumber: 'Row Number',
		// 						name: 'Name',
		// 						email: 'Email',
		// 						birthDate: 'Birth Date',
		// 						gender: 'Gender',
		// 						tags: 'Tags',
		// 						about: 'About',
		// 						country: 'Country',
		// 						state: 'State',
		// 						city: 'City',
		// 						zipCode: 'Zip Code',
		// 						address1: 'Address1',
		// 						address2: 'Address2',
		// 						district: 'District',
		// 						addressDescription: 'Address Description',
		// 						addressTypes: 'Address Types',
		// 						phoneType: 'Phone Type',
		// 						phoneNumber: 'Phone Number',
		// 						phoneMessengers: 'Phone Messengers',
		// 						other: 'Other',
		// 					},
		// 				};
		// 			try {
		// 				const customerFileUploadTemplateRows: ICustomerFileUploadTemplateRow[] =
		// 					await this._getCustomerFileUploadTemplateRowsByFilename(filename);
		// 				await this._filesUploadsService.findByIdAndUpdate(fileUploadId, {
		// 					$set: {
		// 						updatedAt: new Date(),
		// 						totalToProcess: customerFileUploadTemplateRows.length,
		// 					},
		// 				});
		// 				fileUploadTemplateError.rowsError =
		// 					await this._processCustomerFileUploadTemplateRows(
		// 						customerFileUploadTemplateRows,
		// 						userId,
		// 						tags,
		// 						now,
		// 					);
		// 				await this._filesUploadsService.findByIdAndUpdate(fileUploadId, {
		// 					$set: {
		// 						updatedAt: new Date(),
		// 						totalError: fileUploadTemplateError.rowsError.length,
		// 						totalSuccess:
		// 							customerFileUploadTemplateRows.length -
		// 							fileUploadTemplateError.rowsError.length,
		// 						totalProcessed: customerFileUploadTemplateRows.length,
		// 					},
		// 				});
		// 			} catch (error: any) {
		// 				fileUploadTemplateError.processError = error?.message;
		// 				this._logger.error(error);
		// 			} finally {
		// 				await this._filesService.deleteFile(filename);
		// 			}
		// 			const fileUploadSet: Partial<IFileUpload> = {
		// 				updatedAt: new Date(),
		// 				status: FilesUploadsEnum.Status.COMPLETED,
		// 			};
		// 			if (
		// 				fileUploadTemplateError.rowsError.length > 0 ||
		// 				fileUploadTemplateError.processError
		// 			) {
		// 				fileUploadTemplateErrors.push(fileUploadTemplateError);
		// 				fileUploadSet.errors = fileUploadTemplateError;
		// 				fileUploadSet.status = FilesUploadsEnum.Status.ERROR;
		// 			}
		// 			await this._filesUploadsService.findByIdAndUpdate(fileUploadId, {
		// 				$set: fileUploadSet,
		// 			});
		// 			this._socketsGateway.handleResponseUploadCustomersFileToUser(userId);
		// 		}
		// 		this._socketsGateway.handleUploadCustomersResponseToEmployee(
		// 			fileUploadTemplateErrors,
		// 			employeeId,
		// 		);
		// 	})
		// 	.catch((error: any) => {
		// 		this._logger.error(error);
		// 		throw new Error('Error when attempt process customers upload.');
		// 	});
	}

	// #endregion
}

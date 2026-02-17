import * as ExcelJS from 'exceljs';
import { find, includes, isNil } from 'lodash';
import {
	FilterQuery,
	Model,
	QueryOptions,
	Types,
	UpdateQuery,
	UpdateWithAggregationPipeline,
} from 'mongoose';

import {
	forwardRef,
	Inject,
	Injectable,
	InternalServerErrorException,
	Logger,
	NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { schemasName } from '../../infra/database/mongo/schemas';
import CommonEnum from '../../shared/common/global/common.enum';
import { parseToDate } from '../../shared/utils/dates/dates.utils';
import { valueOrCreateUniqueSuffix } from '../../shared/utils/global/global';
import {
	arrayObjectIdToString,
	arrayStringToObjectId,
	hasSpecialCharacters,
	parseToUpperAndUnderline,
} from '../../shared/utils/strings/strings';
import {
	queryOptions,
	queryOptionsBySort,
} from '../../shared/utils/table/table-state';
import {
	ITableStateRequest,
	ITableStateResponse,
} from '../../shared/utils/table/table-state.interface';
import { CategoriesService } from '../categories/categories.service';
import CategoriesEnum from '../categories/interfaces/categories.enum';
import { ICategory } from '../categories/interfaces/category.interface';
import { FilesUploadsService } from '../files-uploads/files-uploads.service';
import { IFileUpload } from '../files-uploads/interfaces/file-upload.interface';
import FilesUploadsEnum from '../files-uploads/interfaces/files-uploads.enum';
import {
	IFileUploadTemplateError,
	IFileUploadTemplateErrorRow,
} from '../files-uploads/interfaces/files-uploads.type';
import { FilesService } from '../files/files-service';
import { NotificationsService } from '../notifications/notifications.service';
import { IProduct } from '../products/interfaces/product.interface';
import { ProductsService } from '../products/products.service';
import { SocketsGateway } from '../sockets/sockets.gateway';
import { IStore } from '../stores/interfaces/store.interface';
import { StoresService } from '../stores/stores.service';
import TagsEnum from '../tags/interfaces/tags.enum';
import { ITag } from '../tags/interfaces/tags.interface';
import { TagsService } from '../tags/tags.service';
import { UsersService } from '../users/users.service';
import CreateProductItemDto from './interfaces/dto/createProductItem.dto';
import UpdateProductItemDto from './interfaces/dto/updateProductItem.dto';
import {
	IProductItem,
	IProductItemHistoricPrice,
} from './interfaces/product-item.interface';
import { ProductItem } from './interfaces/product-item.schema';
import {
	IFiltersDownloadProductItems,
	IProductItemFileUploadTemplateRow,
} from './interfaces/product-items.type';
import { ProductItemsValidationService } from './product-items-validation.service';

@Injectable()
export class ProductItemsService {
	// #region Private Properties

	private readonly _logger: Logger;

	// #endregion

	// #region Constructor

	constructor(
		@InjectModel(schemasName.productItem)
		private readonly _productItemModel: Model<ProductItem>,
		private readonly _usersService: UsersService,
		private readonly _filesService: FilesService,
		private readonly _notificationsService: NotificationsService,
		private readonly _filesUploadsService: FilesUploadsService,
		private readonly _tagsService: TagsService,
		private readonly _categoriesService: CategoriesService,
		private readonly _socketsGateway: SocketsGateway,
		private readonly _productItemsValidationService: ProductItemsValidationService,
		private readonly _storeService: StoresService,
		@Inject(forwardRef(() => ProductsService))
		private readonly _productsService: ProductsService,
	) {
		this._logger = new Logger(ProductItemsService.name);
	}

	// #endregion

	// #region Public Methods

	public async findById(productItemId: string): Promise<IProductItem | null> {
		return this._productItemModel.findById(productItemId);
	}

	public async findByIds(productItemIds: string[]): Promise<IProductItem[]> {
		return this._productItemModel.find({ _id: { $in: productItemIds } });
	}

	public async findByProduct(productId: string): Promise<IProductItem[]> {
		return await this._productItemModel.find({ productId });
	}

	public async findByIdOrFail(productItemId: string): Promise<IProductItem> {
		const productItem: IProductItem | null = await this.findById(productItemId);

		if (!productItem) {
			throw new NotFoundException('Product item not found!');
		}

		return productItem;
	}

	public async findByUserId(userId: string): Promise<IProductItem[]> {
		return await this._productItemModel.find({ userId });
	}

	public async findByUserIdAndBarcodes(
		userId: string,
		barcodes: string[],
	): Promise<IProductItem[]> {
		return await this._productItemModel.find({
			userId,
			barcode: { $in: barcodes },
		});
	}

	public async countByUserId(userId: string): Promise<number> {
		return await this._productItemModel.countDocuments({
			userId,
		});
	}

	public async findByUserTableState(
		userId: string,
		tableState: ITableStateRequest<IProductItem>,
	): Promise<ITableStateResponse<IProductItem[]>> {
		const filter: FilterQuery<IProductItem> = {
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
					barcode: search,
				},
				{
					sku: search,
				},
			];
		}

		if (tableState.filters?.isActive?.length === 1) {
			filter.isActive = tableState.filters.isActive[0];
		}

		if (tableState.filters?.isDefault?.length === 1) {
			filter.isDefault = tableState.filters.isDefault[0];
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

		if (tableState?.filters?.productIds?.length) {
			filter.productId = { $in: tableState.filters.productIds };
		}

		if (tableState?.filters?.rangeDate?.length) {
			const [startDate, endDate] = tableState.filters.rangeDate;
			const fieldDate = tableState.filters.fieldDate || 'createdAt';

			filter[fieldDate] = {
				$gte: new Date(startDate),
				$lte: new Date(endDate),
			};
		}

		const response: ITableStateResponse<IProductItem[]> = {
			data: [],
			total: 0,
		};

		response.total = await this._productItemModel.countDocuments(filter);
		response.data = await this._productItemModel
			.find(filter, null, queryOptions<IProductItem>(tableState))
			.populate('product', 'name')
			.exec();

		return response;
	}

	public async findByUserIdAndPropertiesNotDefault(
		productId: string,
		userId: string,
		name: string,
		barcode: string,
	): Promise<IProductItem | null> {
		return this._productItemModel.findOne({
			name,
			userId,
			barcode: barcode,
			productId,
			isDefault: false,
		});
	}

	public async create(
		files: Express.Multer.File[],
		createProductItemDto: CreateProductItemDto,
		userId: string,
	): Promise<IProductItem> {
		if (typeof createProductItemDto.storeIds === 'string') {
			createProductItemDto.storeIds = JSON.parse(createProductItemDto.storeIds);
		}

		if (typeof createProductItemDto.categoriesIds === 'string') {
			createProductItemDto.categoriesIds = JSON.parse(
				createProductItemDto.categoriesIds,
			);
		}

		if (typeof createProductItemDto.tagsIds === 'string') {
			createProductItemDto.tagsIds = JSON.parse(createProductItemDto.tagsIds);
		}

		if (typeof createProductItemDto.dimensions === 'string') {
			createProductItemDto.dimensions = JSON.parse(
				createProductItemDto.dimensions,
			);
		}

		if (typeof createProductItemDto.colors === 'string') {
			createProductItemDto.colors = JSON.parse(createProductItemDto.colors);
		}

		const filesUrl: string[] =
			await this._filesService.getUploadFilesUrl(files);

		const now: Date = new Date();

		const productItem = new this._productItemModel({
			description: createProductItemDto.description,
			filesUrl,
			isActive: createProductItemDto.isActive,
			isDefault: createProductItemDto.isDefault ?? false,
			name: createProductItemDto.name,
			price: createProductItemDto.price,
			quantity: createProductItemDto.quantity,
			details: createProductItemDto.details,
			storeIds: createProductItemDto.storeIds,
			categoriesIds: createProductItemDto.categoriesIds,
			tagsIds: createProductItemDto.tagsIds,
			userId,
			mainUrl: filesUrl?.[0] ?? null,
			barcode: valueOrCreateUniqueSuffix(createProductItemDto.barcode),
			sku: valueOrCreateUniqueSuffix(createProductItemDto.sku),
			previousBarcodes: [],
			QRCode: createProductItemDto.QRCode,
			createdAt: now,
			updatedAt: now,
			uploadFilename: null,
			brand: createProductItemDto.brand,
			historicPrices: [],
			releaseDate: createProductItemDto.releaseDate
				? parseToDate(createProductItemDto.releaseDate)
				: null,
			expirationDate: createProductItemDto.expirationDate
				? parseToDate(createProductItemDto.expirationDate)
				: null,
			colors: createProductItemDto.colors,
			dimensions: createProductItemDto.dimensions,
			productId: createProductItemDto.productId,
		});

		return await productItem.save();
	}

	public async createDefaultProductItem(
		product: IProduct,
	): Promise<IProductItem> {
		const productItem = new this._productItemModel({
			name: product.name,
			description: product.description,
			filesUrl: product.filesUrl || [],
			isActive: product.isActive,
			price: product.price,
			quantity: product.quantity,
			details: product.details,
			storeIds: product.storeIds,
			categoriesIds: product.categoriesIds,
			tagsIds: product.tagsIds,
			userId: product.userId,
			mainUrl: product.mainUrl,
			barcode: product.barcode,
			sku: product.sku,
			previousBarcodes: product.previousBarcodes,
			QRCode: product.QRCode,
			createdAt: product.createdAt,
			updatedAt: product.updatedAt,
			uploadFilename: product.uploadFilename,
			brand: product.brand,
			historicPrices: product.historicPrices,
			releaseDate: product.releaseDate,
			expirationDate: product.expirationDate,
			colors: product.colors,
			dimensions: product.dimensions,
			productId: product._id,
			isDefault: true,
		});

		return await productItem.save();
	}

	public async createDefaultProductItems(
		products: IProduct[],
	): Promise<IProductItem[]> {
		const productItems = products.map((product: IProduct) => ({
			name: `${product.name} - Default`,
			description: product.description,
			filesUrl: product.filesUrl || [],
			isActive: product.isActive,
			price: product.price,
			quantity: product.quantity,
			details: product.details,
			storeIds: product.storeIds,
			categoriesIds: product.categoriesIds,
			tagsIds: product.tagsIds,
			userId: product.userId,
			mainUrl: product.mainUrl,
			barcode: product.barcode,
			sku: product.sku,
			previousBarcodes: product.previousBarcodes,
			QRCode: product.QRCode,
			createdAt: product.createdAt,
			updatedAt: product.updatedAt,
			uploadFilename: product.uploadFilename,
			brand: product.brand,
			historicPrices: product.historicPrices,
			releaseDate: product.releaseDate,
			expirationDate: product.expirationDate,
			colors: product.colors,
			dimensions: product.dimensions,
			productId: product._id,
			isDefault: true,
		}));

		return await this._productItemModel.create(productItems);
	}

	public async updateDefaultProductItem(product: IProduct): Promise<void> {
		try {
			const defaultProductItem: IProductItem | null =
				await this._productItemModel.findOne({
					productId: product._id,
					isDefault: true,
				});

			if (!defaultProductItem) {
				await this.createDefaultProductItem(product);
				return;
			}

			await this._productItemModel.findByIdAndUpdate(defaultProductItem._id, {
				$set: {
					name: product.name,
					description: product.description,
					filesUrl: product.filesUrl || [],
					isActive: product.isActive,
					price: product.price,
					quantity: product.quantity,
					details: product.details,
					storeIds: product.storeIds,
					categoriesIds: product.categoriesIds,
					tagsIds: product.tagsIds,
					mainUrl: product.mainUrl,
					barcode: product.barcode,
					sku: product.sku,
					QRCode: product.QRCode,
					updatedAt: product.updatedAt,
					brand: product.brand,
					releaseDate: product.releaseDate,
					expirationDate: product.expirationDate,
					colors: product.colors,
					dimensions: product.dimensions,
					historicPrices: product.historicPrices,
					previousBarcodes: product.previousBarcodes,
					uploadFilename: product.uploadFilename,
				},
			});
		} catch (error: any) {
			this._logger.error(
				`Error updating default product item for product ${product._id}: ${error.message}`,
			);
		}
	}

	public async update(
		files: Express.Multer.File[],
		updateProductItemDto: UpdateProductItemDto,
	): Promise<IProductItem> {
		const productItem: IProductItem = await this.findByIdOrFail(
			updateProductItemDto.productItemId,
		);

		if (typeof updateProductItemDto.deletedFilesUrl === 'string') {
			updateProductItemDto.deletedFilesUrl = JSON.parse(
				updateProductItemDto.deletedFilesUrl,
			);

			if (updateProductItemDto.deletedFilesUrl.length) {
				await this._filesService.deleteFiles(
					updateProductItemDto.deletedFilesUrl,
				);
			}
		}

		if (typeof updateProductItemDto.storeIds === 'string') {
			updateProductItemDto.storeIds = JSON.parse(updateProductItemDto.storeIds);
		}

		if (typeof updateProductItemDto.categoriesIds === 'string') {
			updateProductItemDto.categoriesIds = JSON.parse(
				updateProductItemDto.categoriesIds,
			);
		}

		if (typeof updateProductItemDto.tagsIds === 'string') {
			updateProductItemDto.tagsIds = JSON.parse(updateProductItemDto.tagsIds);
		}

		if (typeof updateProductItemDto.dimensions === 'string') {
			updateProductItemDto.dimensions = JSON.parse(
				updateProductItemDto.dimensions,
			);
		}

		if (typeof updateProductItemDto.colors === 'string') {
			updateProductItemDto.colors = JSON.parse(updateProductItemDto.colors);
		}

		const filesUrl: string[] =
			await this._filesService.getUploadFilesUrl(files);

		productItem.filesUrl = productItem.filesUrl.filter(
			(fileUrl: string) =>
				!updateProductItemDto.deletedFilesUrl.find(
					(deletedFileUrl: string) => deletedFileUrl === fileUrl,
				),
		);

		productItem.filesUrl.push(...filesUrl);

		const now: Date = new Date();

		const barcode: string = valueOrCreateUniqueSuffix(
			updateProductItemDto.barcode,
		);

		const previousBarcodes: string[] = productItem.previousBarcodes ?? [];

		if (!!productItem.barcode?.trim() && productItem.barcode !== barcode) {
			previousBarcodes.push(productItem.barcode);
		}

		const historicPrices: IProductItemHistoricPrice[] =
			productItem.historicPrices ?? [];

		if (
			parseFloat(updateProductItemDto.price.toString()) !==
			parseFloat(productItem.price.toString())
		) {
			historicPrices.push({
				barcode: productItem.barcode,
				price: productItem.price,
				updatedAt: now,
			});
		}

		return await this._productItemModel.findByIdAndUpdate(productItem._id, {
			$set: {
				filesUrl: productItem.filesUrl,
				description: updateProductItemDto.description,
				isActive: updateProductItemDto.isActive,
				isDefault: updateProductItemDto.isDefault ?? productItem.isDefault,
				name: updateProductItemDto.name,
				price: updateProductItemDto.price,
				quantity: updateProductItemDto.quantity,
				details: updateProductItemDto.details,
				storeIds: updateProductItemDto.storeIds,
				categoriesIds: updateProductItemDto.categoriesIds,
				tagsIds: updateProductItemDto.tagsIds,
				barcode,
				sku: valueOrCreateUniqueSuffix(updateProductItemDto.sku),
				previousBarcodes,
				mainUrl: productItem.filesUrl?.[0] ?? null,
				QRCode: updateProductItemDto.QRCode,
				updatedAt: now,
				brand: updateProductItemDto.brand,
				historicPrices,
				releaseDate: updateProductItemDto.releaseDate
					? parseToDate(updateProductItemDto.releaseDate)
					: null,
				expirationDate: updateProductItemDto.expirationDate
					? parseToDate(updateProductItemDto.expirationDate)
					: null,
				colors: updateProductItemDto.colors,
				dimensions: updateProductItemDto.dimensions,
			},
		});
	}

	public async updateOne(
		filter?: FilterQuery<ProductItem>,
		update?: UpdateWithAggregationPipeline | UpdateQuery<IProductItem>,
		options?: QueryOptions<IProductItem>,
	): Promise<IProductItem | null> {
		return this._productItemModel.findOneAndUpdate(filter, update, options);
	}

	public async uploadProductItems(
		productId: string,
		files: Express.Multer.File[],
		userId: string,
		employeeId: string,
	): Promise<void> {
		await this._productsService.findByIdOrFail(productId);

		const hasUploadProcessing: boolean =
			await this._filesUploadsService.hasUploadProductItemsProcessingByUserId(
				userId,
			);

		if (hasUploadProcessing) {
			throw new InternalServerErrorException(
				'In the moment you have upload product items files processing. please wait finish to try upload new files.',
			);
		}

		const tags: ITag[] = await this._tagsService.findByType(
			userId,
			TagsEnum.Type.PRODUCT,
		);

		const categories: ICategory[] = await this._categoriesService.findByType(
			CategoriesEnum.Type.PRODUCT,
			userId,
		);

		const stores: IStore[] = await this._storeService.findByUserId(userId);

		const now: Date = new Date();

		this._filesService
			.getUploadFilesUrl(files)
			.then(async (filenames: string[]) => {
				const filesUploads: IFileUpload[] =
					await this._filesUploadsService.createMulti({
						employeeId,
						filenames,
						type: FilesUploadsEnum.Type.UPLOAD_PRODUCT_ITEMS,
						userId,
					});

				const fileUploadTemplateErrors: IFileUploadTemplateError<IProductItemFileUploadTemplateRow>[] =
					[];

				for await (const [
					index,
					{ filename, _id: fileUploadId },
				] of filesUploads.entries()) {
					await this._filesUploadsService.findByIdAndUpdate(fileUploadId, {
						$set: {
							status: FilesUploadsEnum.Status.PROCESSING,
							updatedAt: new Date(),
						},
					});

					const fileUploadTemplateError: IFileUploadTemplateError<IProductItemFileUploadTemplateRow> =
						{
							filename,
							fileNumber: index + 1,
							rowsError: [],
							processError: undefined,
							fileColumns: {
								rowNumber: 'Row Number',
								image: 'Image',
								name: 'Name',
								barcode: 'Barcode',
								sku: 'SKU',
								description: 'Description',
								price: 'Price',
								quantity: 'Quantity',
								stores: 'Stores',
								categories: 'Categories',
								tags: 'Tags',
								isActive: 'Is Active',
								details: 'Details',
								brand: 'Brand',
								releaseDate: 'Release Date',
								expirationDate: 'Expiration Date',
								colors: 'Colors',
								dimensionSize: 'Dimension Size',
								dimensionHeight: 'Dimension Height',
								dimensionWidth: 'Dimension Width',
								dimensionLength: 'Dimension Length',
								dimensionDepth: 'Dimension Depth',
								dimensionDiameter: 'Dimension Diameter',
								dimensionThickness: 'Dimension Thickness',
								dimensionVolume: 'Dimension Volume',
								dimensionWeight: 'Dimension Weight',
								other: 'Other',
							},
						};
					try {
						const productItemFileUploadTemplateRows: IProductItemFileUploadTemplateRow[] =
							await this._getProductItemFileUploadTemplateRowsByFilename(
								filename,
							);

						await this._filesUploadsService.findByIdAndUpdate(fileUploadId, {
							$set: {
								updatedAt: new Date(),
								totalToProcess: productItemFileUploadTemplateRows.length,
							},
						});

						fileUploadTemplateError.rowsError =
							await this._processProductItemFileUploadTemplateRows(
								productId,
								productItemFileUploadTemplateRows,
								userId,
								tags,
								categories,
								stores,
								now,
								filename,
							);

						await this._filesUploadsService.findByIdAndUpdate(fileUploadId, {
							$set: {
								updatedAt: new Date(),
								totalError: fileUploadTemplateError.rowsError.length,
								totalSuccess:
									productItemFileUploadTemplateRows.length -
									fileUploadTemplateError.rowsError.length,
								totalProcessed: productItemFileUploadTemplateRows.length,
							},
						});
					} catch (error: any) {
						fileUploadTemplateError.processError = error?.message;
						this._logger.error(error);
					} finally {
						await this._filesService.deleteFile(filename);
					}

					const fileUploadSet: Partial<IFileUpload> = {
						updatedAt: new Date(),
						status: FilesUploadsEnum.Status.COMPLETED,
					};

					if (
						fileUploadTemplateError.rowsError.length > 0 ||
						fileUploadTemplateError.processError
					) {
						fileUploadTemplateErrors.push(fileUploadTemplateError);
						fileUploadSet.errors = fileUploadTemplateError;
						fileUploadSet.status = FilesUploadsEnum.Status.ERROR;
					}

					await this._filesUploadsService.findByIdAndUpdate(fileUploadId, {
						$set: fileUploadSet,
					});

					this._socketsGateway.handleResponseUploadProductItemsFileToUser(
						userId,
					);
				}

				this._socketsGateway.handleUploadProductItemsResponseToEmployee(
					fileUploadTemplateErrors,
					employeeId,
				);
			})
			.catch((error: any) => {
				this._logger.error(error);
				throw new Error('Error when attempt process product items upload.');
			});
	}

	public async downloadProductItems(
		userId: string,
		filters: IFiltersDownloadProductItems,
	): Promise<Buffer> {
		const filter: FilterQuery<IProductItem> = {
			userId,
		};

		if (filters.search) {
			const search = new RegExp(filters.search, 'ig');

			filter.$or = [
				{
					name: search,
				},
				{
					barcode: search,
				},
				{
					description: search,
				},
				{
					sku: search,
				},
			];
		}

		if (filters.storeIds?.length) {
			filter.storeIds = { $in: filters.storeIds };
		}

		if (filters.categoriesIds?.length) {
			filter.categoriesIds = { $in: filters.categoriesIds };
		}

		if (filters.tagsIds?.length) {
			filter.tagsIds = { $in: filters.tagsIds };
		}

		if (filters.productIds?.length) {
			filter.productId = { $in: filters.productIds };
		}

		if (!isNil(filters.isActive)) {
			filter.isActive = filters.isActive;
		}

		const productItems: IProductItem[] = await this._productItemModel
			.find(
				filter,
				null,
				queryOptionsBySort<IProductItem>({
					field: filters.sortField as any,
					order: filters.sortOrder,
				}),
			)
			.populate('productId', 'name barcode')
			.exec();

		const tags: ITag[] = await this._tagsService.findByType(
			userId,
			TagsEnum.Type.PRODUCT,
		);

		const categories: ICategory[] = await this._categoriesService.findByType(
			CategoriesEnum.Type.PRODUCT,
			userId,
		);

		const stores: IStore[] = await this._storeService.findByUserId(userId);

		const workbook: ExcelJS.Workbook = new ExcelJS.Workbook();
		const worksheet: ExcelJS.Worksheet = workbook.addWorksheet('Data');

		const columns = {
			image: 'Image',
			name: 'Name',
			barcode: 'Barcode',
			sku: 'SKU',
			description: 'Description',
			price: 'Price',
			quantity: 'Quantity',
			stores: 'Stores',
			categories: 'Categories',
			tags: 'Tags',
			isActive: 'Is Active',
			isDefault: 'Is Default',
			details: 'Details',
			brand: 'Brand',
			releaseDate: 'Release Date',
			expirationDate: 'Expiration Date',
			colors: 'Colors',
			dimensionSize: 'Dimension Size',
			dimensionHeight: 'Dimension Height',
			dimensionWidth: 'Dimension Width',
			dimensionLength: 'Dimension Length',
			dimensionDepth: 'Dimension Depth',
			dimensionDiameter: 'Dimension Diameter',
			dimensionThickness: 'Dimension Thickness',
			dimensionVolume: 'Dimension Volume',
			dimensionWeight: 'Dimension Weight',
			productName: 'Product Name',
			productBarcode: 'Product Barcode',
			QRCode: 'QRCode',
			createdAt: 'Created At',
			updatedAt: 'Updated At',
		};

		const sheetColumns: any[] = [];

		for (const columnKey in columns) {
			sheetColumns.push({
				header: columns[columnKey],
				key: columnKey,
				width: 20,
			});
		}

		worksheet.columns = sheetColumns;

		for (const productItem of productItems) {
			const tagsNames: string = productItem.tagsIds.reduce(
				(acc: string, tagId, index: number) => {
					const tag = find(tags, { _id: tagId }) as ITag | undefined;

					const isLastIndex: boolean = productItem.tagsIds.length - 1 === index;

					if (tag) {
						acc += `${tag.name}${isLastIndex ? '' : ', '}`;
					}

					return acc;
				},
				'',
			);

			const categoriesNames: string = productItem.categoriesIds.reduce(
				(acc: string, categoryId, index: number) => {
					const category = find(categories, { _id: categoryId }) as
						| ICategory
						| undefined;

					const isLastIndex: boolean =
						productItem.categoriesIds.length - 1 === index;

					if (category) {
						acc += `${category.name}${isLastIndex ? '' : ', '}`;
					}

					return acc;
				},
				'',
			);

			const storesNames: string = productItem.storeIds.reduce(
				(acc: string, storeId, index: number) => {
					const store = find(stores, { _id: storeId }) as IStore | undefined;

					const isLastIndex: boolean =
						productItem.storeIds.length - 1 === index;

					if (store) {
						acc += `${store.name}${isLastIndex ? '' : ', '}`;
					}

					return acc;
				},
				'',
			);

			const relatedProduct = productItem.productId as any;

			worksheet.addRow({
				image: '',
				name: productItem.name,
				barcode: productItem.barcode,
				sku: productItem.sku || '',
				description: productItem.description,
				price: productItem.price,
				quantity: productItem.quantity,
				stores: storesNames,
				categories: categoriesNames,
				tags: tagsNames,
				isActive: productItem.isActive ? 'YES' : 'NO',
				isDefault: productItem.isDefault ? 'YES' : 'NO',
				details: productItem.details,
				brand: productItem.brand || '',
				releaseDate: productItem.releaseDate || '',
				expirationDate: productItem.expirationDate || '',
				colors: productItem.colors?.join(', ') || '',
				dimensionSize: productItem.dimensions?.size || '',
				dimensionHeight: productItem.dimensions?.height || '',
				dimensionWidth: productItem.dimensions?.width || '',
				dimensionLength: productItem.dimensions?.length || '',
				dimensionDepth: productItem.dimensions?.depth || '',
				dimensionDiameter: productItem.dimensions?.diameter || '',
				dimensionThickness: productItem.dimensions?.thickness || '',
				dimensionVolume: productItem.dimensions?.volume || '',
				dimensionWeight: productItem.dimensions?.weight || '',
				productName: relatedProduct?.name || '',
				productBarcode: relatedProduct?.barcode || '',
				QRCode: productItem.QRCode,
				createdAt: productItem.createdAt,
				updatedAt: productItem.updatedAt,
			});
		}

		const buffer = await workbook.xlsx.writeBuffer();
		return buffer as Buffer;
	}

	// #endregion

	// #region Private Methods

	private async _getProductItemFileUploadTemplateRowsByFilename(
		filename: string,
	): Promise<IProductItemFileUploadTemplateRow[]> {
		const fileBuffer: Buffer | null =
			await this._filesService.getFileBufferByFilename(filename);

		if (!fileBuffer) {
			throw new Error(`File Error, no data in file: ${filename}`);
		}

		const workbook: ExcelJS.Workbook = new ExcelJS.Workbook();
		await workbook.xlsx.load(fileBuffer);

		const worksheet: ExcelJS.Worksheet = workbook.getWorksheet('Template');

		this._productItemsValidationService.validateProductItemsUploadTemplate(
			worksheet.getRow(1),
		);

		const worksheetRowsCountToIterate: number = worksheet.rowCount + 1;

		const productItemFileUploadTemplateRows: IProductItemFileUploadTemplateRow[] =
			[];

		for (
			let rowNumber = 2;
			rowNumber < worksheetRowsCountToIterate;
			rowNumber++
		) {
			if (worksheetRowsCountToIterate === rowNumber) {
				break;
			}

			const row: ExcelJS.Row = worksheet.getRow(rowNumber);

			const image: string = row.getCell('A')?.text?.trim();
			const name: string = row.getCell('B')?.text?.trim();
			const barcode: string = row.getCell('C')?.text?.trim();
			const sku: string = row.getCell('D')?.text?.trim();
			const description: string = row.getCell('E')?.text?.trim();
			const price: string = row.getCell('F')?.text?.trim();
			const quantity: string = row.getCell('G')?.text?.trim();
			const stores: string = row.getCell('H')?.text?.trim();
			const categories: string = row.getCell('I')?.text?.trim();
			const tags: string = row.getCell('J')?.text?.trim();
			const isActive: string = row.getCell('K')?.text?.trim();
			const details: string = row.getCell('L')?.text?.trim();
			const brand: string = row.getCell('M')?.text?.trim();
			const releaseDate: string = row.getCell('N')?.text?.trim();
			const expirationDate: string = row.getCell('O')?.text?.trim();
			const colors: string = row.getCell('P')?.text?.trim();
			const dimensionSize: string = row.getCell('Q')?.text?.trim();
			const dimensionHeight: string = row.getCell('R')?.text?.trim();
			const dimensionWidth: string = row.getCell('S')?.text?.trim();
			const dimensionLength: string = row.getCell('T')?.text?.trim();
			const dimensionDepth: string = row.getCell('U')?.text?.trim();
			const dimensionDiameter: string = row.getCell('V')?.text?.trim();
			const dimensionThickness: string = row.getCell('W')?.text?.trim();
			const dimensionVolume: string = row.getCell('X')?.text?.trim();
			const dimensionWeight: string = row.getCell('Y')?.text?.trim();

			productItemFileUploadTemplateRows.push({
				rowNumber,
				image,
				name,
				barcode,
				sku,
				description,
				price,
				quantity,
				stores,
				categories,
				tags,
				isActive,
				details,
				brand,
				releaseDate,
				expirationDate,
				colors,
				dimensionSize,
				dimensionHeight,
				dimensionWidth,
				dimensionLength,
				dimensionDepth,
				dimensionDiameter,
				dimensionThickness,
				dimensionVolume,
				dimensionWeight,
			});
		}

		return productItemFileUploadTemplateRows;
	}

	private async _processProductItemFileUploadTemplateRows(
		productId: string,
		productItemFileUploadTemplateRows: IProductItemFileUploadTemplateRow[],
		userId: string,
		tags: ITag[],
		categories: ICategory[],
		stores: IStore[],
		now: Date,
		filename: string,
	): Promise<IFileUploadTemplateErrorRow<IProductItemFileUploadTemplateRow>[]> {
		const productItemsToCreate: Omit<IProductItem, '_id'>[] = [];

		const fileUploadTemplateErrorRows: IFileUploadTemplateErrorRow<IProductItemFileUploadTemplateRow>[] =
			[];

		for await (const productItemFileUploadTemplateRow of productItemFileUploadTemplateRows) {
			const fileUploadTemplateErrorRow: IFileUploadTemplateErrorRow<IProductItemFileUploadTemplateRow> =
				{
					rowNumber: productItemFileUploadTemplateRow.rowNumber,
					reasons: [],
				};

			try {
				if (!productItemFileUploadTemplateRow.name?.trim()) {
					fileUploadTemplateErrorRow.reasons.push({
						message: 'Name is required!',
						property: 'name',
					});
				}

				if (
					productItemFileUploadTemplateRow.barcode?.trim() &&
					hasSpecialCharacters(productItemFileUploadTemplateRow.barcode)
				) {
					fileUploadTemplateErrorRow.reasons.push({
						message: 'Barcode invalid!',
						property: 'barcode',
					});
				}

				if (
					productItemFileUploadTemplateRow.price?.toString()?.trim() &&
					isNaN(+productItemFileUploadTemplateRow.price)
				) {
					fileUploadTemplateErrorRow.reasons.push({
						message: 'Price invalid!',
						property: 'price',
					});
				}

				if (
					productItemFileUploadTemplateRow.quantity?.toString()?.trim() &&
					isNaN(+productItemFileUploadTemplateRow.quantity)
				) {
					fileUploadTemplateErrorRow.reasons.push({
						message: 'Quantity invalid!',
						property: 'quantity',
					});
				}

				if (fileUploadTemplateErrorRow.reasons.length > 0) {
					fileUploadTemplateErrorRows.push(fileUploadTemplateErrorRow);
					continue;
				}

				const productItemToUpdate: IProductItem | null =
					productItemFileUploadTemplateRow.name &&
					productItemFileUploadTemplateRow.barcode
						? await this.findByUserIdAndPropertiesNotDefault(
								productId,
								userId,
								productItemFileUploadTemplateRow.name,
								productItemFileUploadTemplateRow.barcode,
						  )
						: null;

				const tagsByProductItemUploadTemplateRow: string[] =
					await this._getTagsByProductItemFileUploadTemplateRow(
						productItemFileUploadTemplateRow.tags,
						userId,
						tags,
						arrayObjectIdToString(productItemToUpdate?.tagsIds as any[]),
					);

				const tagsIds: Types.ObjectId[] = arrayStringToObjectId(
					tagsByProductItemUploadTemplateRow,
				);

				const categoriesByProductItemUploadTemplateRow: string[] =
					await this._getCategoriesByProductItemFileUploadTemplateRow(
						productItemFileUploadTemplateRow.categories,
						userId,
						categories,
						arrayObjectIdToString(productItemToUpdate?.categoriesIds as any[]),
					);

				const categoriesIds: Types.ObjectId[] = arrayStringToObjectId(
					categoriesByProductItemUploadTemplateRow,
				);

				const storesByProductItemUploadTemplateRow: string[] =
					await this._getStoresByProductItemFileUploadTemplateRow(
						productItemFileUploadTemplateRow.stores,
						stores,
						arrayObjectIdToString(productItemToUpdate?.storeIds as any[]),
					);

				const storeIds: Types.ObjectId[] = arrayStringToObjectId(
					storesByProductItemUploadTemplateRow,
				);

				if (productItemToUpdate) {
					productItemToUpdate.tagsIds = tagsIds as any[];
					productItemToUpdate.categoriesIds = categoriesIds as any[];
					productItemToUpdate.storeIds = storeIds as any[];
					productItemToUpdate.description =
						productItemFileUploadTemplateRow?.description ??
						productItemToUpdate.description;
					productItemToUpdate.details =
						productItemFileUploadTemplateRow?.details ??
						productItemToUpdate.details;
					productItemToUpdate.price =
						productItemFileUploadTemplateRow.price?.toString()?.length
							? +productItemFileUploadTemplateRow.price
							: productItemToUpdate.price;
					productItemToUpdate.quantity =
						productItemFileUploadTemplateRow.quantity?.toString()?.length
							? +productItemFileUploadTemplateRow.quantity
							: productItemToUpdate.quantity;
					productItemToUpdate.isActive =
						productItemFileUploadTemplateRow.isActive?.trim()
							? productItemFileUploadTemplateRow.isActive?.toUpperCase() ===
							  CommonEnum.YesNo.YES
							: productItemToUpdate.isActive;
					productItemToUpdate.sku = valueOrCreateUniqueSuffix(
						productItemFileUploadTemplateRow.sku ?? productItemToUpdate.sku,
					);
					productItemToUpdate.brand =
						productItemFileUploadTemplateRow.brand ?? productItemToUpdate.brand;
					productItemToUpdate.releaseDate =
						productItemFileUploadTemplateRow.releaseDate
							? parseToDate(productItemFileUploadTemplateRow.releaseDate)
							: productItemToUpdate.releaseDate;

					if (productItemFileUploadTemplateRow.colors?.trim()) {
						const colorsArray: string[] =
							productItemFileUploadTemplateRow.colors
								.split(',')
								.map((c) => c.trim())
								.filter((c) => c);
						productItemToUpdate.colors =
							colorsArray.length > 0 ? colorsArray : productItemToUpdate.colors;
					}

					productItemToUpdate.dimensions = {
						size:
							productItemFileUploadTemplateRow.dimensionSize ??
							productItemToUpdate.dimensions?.size ??
							null,
						height: productItemFileUploadTemplateRow.dimensionHeight
							? +productItemFileUploadTemplateRow.dimensionHeight
							: productItemToUpdate.dimensions?.height ?? null,
						width: productItemFileUploadTemplateRow.dimensionWidth
							? +productItemFileUploadTemplateRow.dimensionWidth
							: productItemToUpdate.dimensions?.width ?? null,
						length: productItemFileUploadTemplateRow.dimensionLength
							? +productItemFileUploadTemplateRow.dimensionLength
							: productItemToUpdate.dimensions?.length ?? null,
						depth: productItemFileUploadTemplateRow.dimensionDepth
							? +productItemFileUploadTemplateRow.dimensionDepth
							: productItemToUpdate.dimensions?.depth ?? null,
						diameter: productItemFileUploadTemplateRow.dimensionDiameter
							? +productItemFileUploadTemplateRow.dimensionDiameter
							: productItemToUpdate.dimensions?.diameter ?? null,
						thickness: productItemFileUploadTemplateRow.dimensionThickness
							? +productItemFileUploadTemplateRow.dimensionThickness
							: productItemToUpdate.dimensions?.thickness ?? null,
						volume: productItemFileUploadTemplateRow.dimensionVolume
							? +productItemFileUploadTemplateRow.dimensionVolume
							: productItemToUpdate.dimensions?.volume ?? null,
						weight: productItemFileUploadTemplateRow.dimensionWeight
							? +productItemFileUploadTemplateRow.dimensionWeight
							: productItemToUpdate.dimensions?.weight ?? null,
					};

					await this.updateOne(
						{
							_id: new Types.ObjectId(productItemToUpdate._id),
						},
						{
							$set: productItemToUpdate,
						},
						{
							new: true,
						},
					);
				} else {
					productItemsToCreate.push({
						name: productItemFileUploadTemplateRow.name,
						tagsIds: tagsIds as any[],
						storeIds: storeIds as any[],
						createdAt: now,
						updatedAt: now,
						userId: userId as any,
						price: productItemFileUploadTemplateRow.price?.toString()?.length
							? +productItemFileUploadTemplateRow.price
							: 0,
						quantity: productItemFileUploadTemplateRow.quantity?.toString()
							?.length
							? +productItemFileUploadTemplateRow.quantity
							: 0,
						isActive: productItemFileUploadTemplateRow.isActive?.trim()
							? productItemFileUploadTemplateRow.isActive?.toUpperCase() ===
							  CommonEnum.YesNo.YES
							: true,
						barcode: valueOrCreateUniqueSuffix(
							productItemFileUploadTemplateRow.barcode,
						),
						sku: valueOrCreateUniqueSuffix(
							productItemFileUploadTemplateRow.sku,
						),
						categoriesIds: categoriesIds as any[],
						description: productItemFileUploadTemplateRow.description,
						details: productItemFileUploadTemplateRow.details,
						filesUrl: [],
						mainUrl: null,
						QRCode: null,
						uploadFilename: filename,
						previousBarcodes: [],
						brand: productItemFileUploadTemplateRow.brand || null,
						historicPrices: [],
						releaseDate: productItemFileUploadTemplateRow.releaseDate
							? parseToDate(productItemFileUploadTemplateRow.releaseDate)
							: null,
						expirationDate: productItemFileUploadTemplateRow.expirationDate
							? parseToDate(productItemFileUploadTemplateRow.expirationDate)
							: null,
						colors: productItemFileUploadTemplateRow.colors?.trim()
							? productItemFileUploadTemplateRow.colors
									.split(',')
									.map((c) => c.trim())
									.filter((c) => c)
							: [],
						dimensions: {
							size: productItemFileUploadTemplateRow.dimensionSize || null,
							height: productItemFileUploadTemplateRow.dimensionHeight
								? +productItemFileUploadTemplateRow.dimensionHeight
								: null,
							width: productItemFileUploadTemplateRow.dimensionWidth
								? +productItemFileUploadTemplateRow.dimensionWidth
								: null,
							length: productItemFileUploadTemplateRow.dimensionLength
								? +productItemFileUploadTemplateRow.dimensionLength
								: null,
							depth: productItemFileUploadTemplateRow.dimensionDepth
								? +productItemFileUploadTemplateRow.dimensionDepth
								: null,
							diameter: productItemFileUploadTemplateRow.dimensionDiameter
								? +productItemFileUploadTemplateRow.dimensionDiameter
								: null,
							thickness: productItemFileUploadTemplateRow.dimensionThickness
								? +productItemFileUploadTemplateRow.dimensionThickness
								: null,
							volume: productItemFileUploadTemplateRow.dimensionVolume
								? +productItemFileUploadTemplateRow.dimensionVolume
								: null,
							weight: productItemFileUploadTemplateRow.dimensionWeight
								? +productItemFileUploadTemplateRow.dimensionWeight
								: null,
						},
						productId: productId as any,
						isDefault: false,
					});
				}
			} catch (error: any) {
				fileUploadTemplateErrorRow.reasons.push({
					message: 'Error when attempt process row',
					property: 'other',
				});

				fileUploadTemplateErrorRows.push(fileUploadTemplateErrorRow);
			}
		}

		if (productItemsToCreate.length > 0) {
			await this._productItemModel.create(productItemsToCreate);
		}

		return fileUploadTemplateErrorRows;
	}

	private async _getTagsByProductItemFileUploadTemplateRow(
		tagsFromRow: string,
		userId: string,
		tagsFromUser: ITag[] = [],
		tagsIdsFromProductItem: string[] = [],
	): Promise<string[]> {
		if (!tagsFromRow?.trim()) {
			return tagsIdsFromProductItem;
		}

		for await (let tagFromRow of tagsFromRow.split(',')) {
			try {
				tagFromRow = tagFromRow?.trim();

				if (!tagFromRow) {
					continue;
				}

				const tagFromUser: ITag | null = find(tagsFromUser, {
					name: tagFromRow,
				});

				if (tagFromUser) {
					const tagIdFromUser: string = tagFromUser._id.toString();
					if (!includes(tagsIdsFromProductItem, tagIdFromUser)) {
						tagsIdsFromProductItem.push(tagIdFromUser);
					}
				} else {
					const tagCreated: ITag = await this._tagsService.create({
						color: TagsEnum.tagDefaultColor,
						description: null,
						name: tagFromRow,
						type: TagsEnum.Type.PRODUCT,
						userId,
					});

					tagsFromUser.push(tagCreated);
					tagsIdsFromProductItem.push(tagCreated._id);
				}
			} catch (error: any) {
				this._logger.error(error);
			}
		}

		return tagsIdsFromProductItem;
	}

	private async _getCategoriesByProductItemFileUploadTemplateRow(
		categoriesFromRow: string,
		userId: string,
		categoriesFromUser: ICategory[] = [],
		categoriesIdsFromProductItem: string[] = [],
	): Promise<string[]> {
		if (!categoriesFromRow?.trim()) {
			return categoriesIdsFromProductItem;
		}

		for await (let categoryFromRow of categoriesFromRow.split(',')) {
			try {
				categoryFromRow = categoryFromRow?.trim();

				if (!categoryFromRow) {
					continue;
				}

				const categoryFromUser: ICategory | null = find(categoriesFromUser, {
					name: categoryFromRow,
				});

				if (categoryFromUser) {
					const categoryIdFromUser: string = categoryFromUser._id.toString();
					if (!includes(categoriesIdsFromProductItem, categoryIdFromUser)) {
						categoriesIdsFromProductItem.push(categoryIdFromUser);
					}
				} else {
					const categoryCreated: ICategory =
						await this._categoriesService.create(
							{
								description: '',
								name: categoryFromRow,
								type: CategoriesEnum.Type.PRODUCT,
								ownerUserId: userId,
								code: parseToUpperAndUnderline(categoryFromRow),
								color: null,
							},
							userId,
						);

					categoriesFromUser.push(categoryCreated);
					categoriesIdsFromProductItem.push(categoryCreated._id);
				}
			} catch (error: any) {
				this._logger.error(error);
			}
		}

		return categoriesIdsFromProductItem;
	}

	private async _getStoresByProductItemFileUploadTemplateRow(
		storesFromRow: string,
		storesFromUser: IStore[] = [],
		storesIdsFromProductItem: string[] = [],
	): Promise<string[]> {
		if (!storesFromRow?.trim()) {
			return storesIdsFromProductItem;
		}

		for await (let storeFromRow of storesFromRow.split(',')) {
			try {
				storeFromRow = storeFromRow?.trim();

				if (!storeFromRow) {
					continue;
				}

				const storeFromUser: IStore | null = find(storesFromUser, {
					name: storeFromRow,
				});

				if (storeFromUser) {
					const storeIdFromUser: string = storeFromUser._id.toString();
					if (!includes(storesIdsFromProductItem, storeIdFromUser)) {
						storesIdsFromProductItem.push(storeIdFromUser);
					}
				}
			} catch (error: any) {
				this._logger.error(error);
			}
		}

		return storesIdsFromProductItem;
	}

	// #endregion
}

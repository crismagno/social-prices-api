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
import { parseDynamicFields } from '../../shared/common/dynamic-field/dynamic-field.utils';
import { parseToDate } from '../../shared/utils/dates/dates.utils';
import { valueOrCreateUniqueSuffix } from '../../shared/utils/global/global';
import { unFreezeData } from '../../shared/utils/objects/objects';
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
import { ProductItemsService } from '../product-items/product-items.service';
import { SocketsGateway } from '../sockets/sockets.gateway';
import { IStore } from '../stores/interfaces/store.interface';
import { StoresService } from '../stores/stores.service';
import TagsEnum from '../tags/interfaces/tags.enum';
import { ITag } from '../tags/interfaces/tags.interface';
import { TagsService } from '../tags/tags.service';
import { IUser } from '../users/interfaces/user.interface';
import { UsersService } from '../users/users.service';
import CreateProductDto from './interfaces/dto/createProduct.dto';
import UpdateProductDto from './interfaces/dto/updateProduct.dto';
import {
	IProduct,
	IProductHistoricPrice,
} from './interfaces/product.interface';
import { Product } from './interfaces/product.schema';
import {
	IFiltersDownloadProducts,
	IProductFileUploadTemplateRow,
} from './interfaces/products.type';
import { ProductsValidationService } from './products-validation.service';

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
		private readonly _filesUploadsService: FilesUploadsService,
		private readonly _tagsService: TagsService,
		private readonly _categoriesService: CategoriesService,
		private readonly _socketsGateway: SocketsGateway,
		private readonly _productsValidationService: ProductsValidationService,
		private readonly _storeService: StoresService,
		@Inject(forwardRef(() => ProductItemsService))
		private readonly _productItemsService: ProductItemsService,
	) {
		this._logger = new Logger(ProductsService.name);
	}

	// #endregion

	// #region Public Methods

	public async findById(productId: string): Promise<IProduct | null> {
		let product: IProduct | null = await this._productModel.findById(productId);

		if (!product) {
			return null;
		}

		product = unFreezeData<IProduct>(product as any);

		product.productItemDefault =
			await this._productItemsService.findDefaultByProductId(product._id);

		return product;
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

	public async findByUserIdAndBarcodes(
		userId: string,
		barcodes: string[],
	): Promise<IProduct[]> {
		return await this._productModel.find({
			userId,
			barcode: { $in: barcodes },
		});
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
			filter.$and = [{ _id: { $in: tableState.filters.productIds } }];
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

	public async findByUserIdAndProperties(
		userId: string,
		name: string,
		barcode: string,
	): Promise<IProduct | null> {
		return this._productModel.findOne({ name, userId, barcode: barcode });
	}

	public async findByUserIdAndBarcode(
		userId: string,
		barcode: string,
	): Promise<IProduct | null> {
		return this._productModel.findOne({ userId, barcode });
	}

	public async create(
		files: Express.Multer.File[],
		createProductDto: CreateProductDto,
		userId: string,
	): Promise<IProduct> {
		const user: IUser = await this._usersService.findOneByIdOrFail(userId);

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

		if (typeof createProductDto.dimensions === 'string') {
			createProductDto.dimensions = JSON.parse(createProductDto.dimensions);
		}

		if (typeof createProductDto.colors === 'string') {
			createProductDto.colors = JSON.parse(createProductDto.colors);
		}

		const filesUrl: string[] =
			await this._filesService.getUploadFilesUrl(files);

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
			barcode: valueOrCreateUniqueSuffix(createProductDto.barcode),
			sku: valueOrCreateUniqueSuffix(createProductDto.sku),
			previousBarcodes: [],
			QRCode: createProductDto.QRCode,
			createdAt: now,
			updatedAt: now,
			uploadFilename: null,
			brand: createProductDto.brand,
			historicPrices: [],
			releaseDate: createProductDto.releaseDate
				? parseToDate(createProductDto.releaseDate)
				: null,
			expirationDate: createProductDto.expirationDate
				? parseToDate(createProductDto.expirationDate)
				: null,
			colors: createProductDto.colors,
			dynamicFields: parseDynamicFields(createProductDto.dynamicFields),
			dimensions: createProductDto.dimensions,
		});

		const newProduct: IProduct = await product.save();

		// Create default product item
		await this._productItemsService.createDefaultProductItem(newProduct);

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

		if (typeof updateProductDto.dimensions === 'string') {
			updateProductDto.dimensions = JSON.parse(updateProductDto.dimensions);
		}

		if (typeof updateProductDto.colors === 'string') {
			updateProductDto.colors = JSON.parse(updateProductDto.colors);
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

		const barcode: string = valueOrCreateUniqueSuffix(updateProductDto.barcode);

		const previousBarcodes: string[] = product.previousBarcodes ?? [];

		if (!!product.barcode?.trim() && product.barcode !== barcode) {
			previousBarcodes.push(product.barcode);
		}

		const historicPrices: IProductHistoricPrice[] =
			product.historicPrices ?? [];

		if (
			parseFloat(updateProductDto.price.toString()) !==
			parseFloat(product.price.toString())
		) {
			historicPrices.push({
				barcode: product.barcode,
				price: product.price,
				updatedAt: now,
			});
		}

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
					barcode,
					sku: valueOrCreateUniqueSuffix(updateProductDto.sku),
					previousBarcodes,
					mainUrl: product.filesUrl?.[0] ?? null,
					QRCode: updateProductDto.QRCode,
					updatedAt: now,
					brand: updateProductDto.brand,
					historicPrices,
					releaseDate: updateProductDto.releaseDate
						? parseToDate(updateProductDto.releaseDate)
						: null,
					expirationDate: updateProductDto.expirationDate
						? parseToDate(updateProductDto.expirationDate)
						: null,
					colors: updateProductDto.colors,
					dynamicFields: parseDynamicFields(updateProductDto.dynamicFields),
					dimensions: updateProductDto.dimensions,
				},
			},
			{
				new: true,
			},
		);

		await this._productItemsService.updateDefaultProductItem(productUpdated);

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
		const hasUploadProcessing: boolean =
			await this._filesUploadsService.hasUploadProductsProcessingByUserId(
				userId,
			);

		if (hasUploadProcessing) {
			throw new InternalServerErrorException(
				'In the moment you have upload products files processing. please wait finish to try upload new files.',
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
						type: FilesUploadsEnum.Type.UPLOAD_PRODUCTS,
						userId,
					});

				const fileUploadTemplateErrors: IFileUploadTemplateError<IProductFileUploadTemplateRow>[] =
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

					const fileUploadTemplateError: IFileUploadTemplateError<IProductFileUploadTemplateRow> =
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
						const productFileUploadTemplateRows: IProductFileUploadTemplateRow[] =
							await this._getProductFileUploadTemplateRowsByFilename(filename);

						await this._filesUploadsService.findByIdAndUpdate(fileUploadId, {
							$set: {
								updatedAt: new Date(),
								totalToProcess: productFileUploadTemplateRows.length,
							},
						});

						fileUploadTemplateError.rowsError =
							await this._processProductFileUploadTemplateRows(
								productFileUploadTemplateRows,
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
									productFileUploadTemplateRows.length -
									fileUploadTemplateError.rowsError.length,
								totalProcessed: productFileUploadTemplateRows.length,
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

					this._socketsGateway.handleResponseUploadProductsFileToUser(userId);
				}

				this._socketsGateway.handleUploadProductsResponseToEmployee(
					fileUploadTemplateErrors,
					employeeId,
				);
			})
			.catch((error: any) => {
				this._logger.error(error);
				throw new Error('Error when attempt process products upload.');
			});
	}

	public async downloadProducts(
		userId: string,
		filters: IFiltersDownloadProducts,
	): Promise<Buffer> {
		const filter: FilterQuery<IProduct> = {
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

		if (!isNil(filters.isActive)) {
			filter.isActive = filters.isActive;
		}

		const products: IProduct[] = await this._productModel.find(
			filter,
			null,
			queryOptionsBySort<IProduct>({
				field: filters.sortField as any,
				order: filters.sortOrder,
			}),
		);

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

		for (const product of products) {
			const tagsNames: string = product.tagsIds.reduce(
				(acc: string, tagId, index: number) => {
					const tag = find(tags, { _id: tagId }) as ITag | undefined;

					const isLastIndex: boolean = product.tagsIds.length - 1 === index;

					if (tag) {
						acc += `${tag.name}${isLastIndex ? '' : ', '}`;
					}

					return acc;
				},
				'',
			);

			const categoriesNames: string = product.categoriesIds.reduce(
				(acc: string, categoryId, index: number) => {
					const category = find(categories, { _id: categoryId }) as
						| ICategory
						| undefined;

					const isLastIndex: boolean =
						product.categoriesIds.length - 1 === index;

					if (category) {
						acc += `${category.name}${isLastIndex ? '' : ', '}`;
					}

					return acc;
				},
				'',
			);

			const storesNames: string = product.storeIds.reduce(
				(acc: string, storeId, index: number) => {
					const store = find(stores, { _id: storeId }) as IStore | undefined;

					const isLastIndex: boolean = product.storeIds.length - 1 === index;

					if (store) {
						acc += `${store.name}${isLastIndex ? '' : ', '}`;
					}

					return acc;
				},
				'',
			);

			worksheet.addRow({
				image: '',
				name: product.name,
				barcode: product.barcode,
				sku: product.sku || '',
				description: product.description,
				price: product.price,
				quantity: product.quantity,
				stores: storesNames,
				categories: categoriesNames,
				tags: tagsNames,
				isActive: product.isActive ? 'YES' : 'NO',
				details: product.details,
				brand: product.brand || '',
				releaseDate: product.releaseDate || '',
				expirationDate: product.expirationDate || '',
				colors: product.colors?.join(', ') || '',
				dimensionSize: product.dimensions?.size || '',
				dimensionHeight: product.dimensions?.height || '',
				dimensionWidth: product.dimensions?.width || '',
				dimensionLength: product.dimensions?.length || '',
				dimensionDepth: product.dimensions?.depth || '',
				dimensionDiameter: product.dimensions?.diameter || '',
				dimensionThickness: product.dimensions?.thickness || '',
				dimensionVolume: product.dimensions?.volume || '',
				dimensionWeight: product.dimensions?.weight || '',
				QRCode: product.QRCode,
				createdAt: product.createdAt,
				updatedAt: product.updatedAt,
			});
		}

		const buffer = await workbook.xlsx.writeBuffer();
		return buffer as Buffer;
	}

	public async deactivateByUserId(userId: string): Promise<void> {
		await this._productModel.updateMany(
			{ userId: new Types.ObjectId(userId) },
			{ $set: { isActive: false } },
		);
	}

	// #endregion

	// #region Private Methods

	private async _getProductFileUploadTemplateRowsByFilename(
		filename: string,
	): Promise<IProductFileUploadTemplateRow[]> {
		const fileBuffer: Buffer | null =
			await this._filesService.getFileBufferByFilename(filename);

		if (!fileBuffer) {
			throw new Error(`File Error, no data in file: ${filename}`);
		}

		const workbook: ExcelJS.Workbook = new ExcelJS.Workbook();
		await workbook.xlsx.load(fileBuffer);

		const worksheet: ExcelJS.Worksheet = workbook.getWorksheet('Template');

		this._productsValidationService.validateProductsUploadTemplate(
			worksheet.getRow(1),
		);

		const worksheetRowsCountToIterate: number = worksheet.rowCount + 1;

		const productFileUploadTemplateRows: IProductFileUploadTemplateRow[] = [];

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

			productFileUploadTemplateRows.push({
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

		return productFileUploadTemplateRows;
	}

	private async _processProductFileUploadTemplateRows(
		productFileUploadTemplateRows: IProductFileUploadTemplateRow[],
		userId: string,
		tags: ITag[],
		categories: ICategory[],
		stores: IStore[],
		now: Date,
		filename: string,
	): Promise<IFileUploadTemplateErrorRow<IProductFileUploadTemplateRow>[]> {
		const productsToCreate: Omit<IProduct, '_id'>[] = [];

		const fileUploadTemplateErrorRows: IFileUploadTemplateErrorRow<IProductFileUploadTemplateRow>[] =
			[];

		for await (const productFileUploadTemplateRow of productFileUploadTemplateRows) {
			const fileUploadTemplateErrorRow: IFileUploadTemplateErrorRow<IProductFileUploadTemplateRow> =
				{
					rowNumber: productFileUploadTemplateRow.rowNumber,
					reasons: [],
				};

			try {
				if (!productFileUploadTemplateRow.name?.trim()) {
					fileUploadTemplateErrorRow.reasons.push({
						message: 'Name is required!',
						property: 'name',
					});
				}

				if (
					productFileUploadTemplateRow.barcode?.trim() &&
					hasSpecialCharacters(productFileUploadTemplateRow.barcode)
				) {
					fileUploadTemplateErrorRow.reasons.push({
						message: 'Barcode invalid!',
						property: 'barcode',
					});
				}

				if (
					productFileUploadTemplateRow.price?.toString()?.trim() &&
					isNaN(+productFileUploadTemplateRow.price)
				) {
					fileUploadTemplateErrorRow.reasons.push({
						message: 'Price invalid!',
						property: 'price',
					});
				}

				if (
					productFileUploadTemplateRow.quantity?.toString()?.trim() &&
					isNaN(+productFileUploadTemplateRow.quantity)
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

				const productToUpdate: IProduct | null =
					productFileUploadTemplateRow.name &&
					productFileUploadTemplateRow.barcode
						? await this.findByUserIdAndProperties(
								userId,
								productFileUploadTemplateRow.name,
								productFileUploadTemplateRow.barcode,
						  )
						: null;

				const tagsByProductUploadTemplateRow: string[] =
					await this._getTagsByProductFileUploadTemplateRow(
						productFileUploadTemplateRow.tags,
						userId,
						tags,
						arrayObjectIdToString(productToUpdate?.tagsIds as any[]),
					);

				const tagsIds: Types.ObjectId[] = arrayStringToObjectId(
					tagsByProductUploadTemplateRow,
				);

				const categoriesByProductUploadTemplateRow: string[] =
					await this._getCategoriesByProductFileUploadTemplateRow(
						productFileUploadTemplateRow.categories,
						userId,
						categories,
						arrayObjectIdToString(productToUpdate?.categoriesIds as any[]),
					);

				const categoriesIds: Types.ObjectId[] = arrayStringToObjectId(
					categoriesByProductUploadTemplateRow,
				);

				const storesByProductUploadTemplateRow: string[] =
					await this._getStoresByProductFileUploadTemplateRow(
						productFileUploadTemplateRow.stores,
						stores,
						arrayObjectIdToString(productToUpdate?.storeIds as any[]),
					);

				const storeIds: Types.ObjectId[] = arrayStringToObjectId(
					storesByProductUploadTemplateRow,
				);

				if (productToUpdate) {
					productToUpdate.tagsIds = tagsIds as any[];
					productToUpdate.categoriesIds = categoriesIds as any[];
					productToUpdate.storeIds = storeIds as any[];
					productToUpdate.description =
						productFileUploadTemplateRow?.description ??
						productToUpdate.description;
					productToUpdate.details =
						productFileUploadTemplateRow?.details ?? productToUpdate.details;
					productToUpdate.price = productFileUploadTemplateRow.price?.toString()
						?.length
						? +productFileUploadTemplateRow.price
						: productToUpdate.price;
					productToUpdate.quantity =
						productFileUploadTemplateRow.quantity?.toString()?.length
							? +productFileUploadTemplateRow.quantity
							: productToUpdate.quantity;
					productToUpdate.isActive =
						productFileUploadTemplateRow.isActive?.trim()
							? productFileUploadTemplateRow.isActive?.toUpperCase() ===
							  CommonEnum.YesNo.YES
							: productToUpdate.isActive;

					// Update new fields
					productToUpdate.sku = valueOrCreateUniqueSuffix(
						productFileUploadTemplateRow.sku ?? productToUpdate.sku,
					);
					productToUpdate.brand =
						productFileUploadTemplateRow.brand ?? productToUpdate.brand;
					productToUpdate.releaseDate = productFileUploadTemplateRow.releaseDate
						? parseToDate(productFileUploadTemplateRow.releaseDate)
						: productToUpdate.releaseDate;
					productToUpdate.expirationDate =
						productFileUploadTemplateRow.expirationDate
							? parseToDate(productFileUploadTemplateRow.expirationDate)
							: productToUpdate.expirationDate;

					if (productFileUploadTemplateRow.colors?.trim()) {
						const colorsArray = productFileUploadTemplateRow.colors
							.split(',')
							.map((c) => c.trim())
							.filter((c) => c);
						productToUpdate.colors =
							colorsArray.length > 0 ? colorsArray : productToUpdate.colors;
					}

					productToUpdate.dimensions = {
						size:
							productFileUploadTemplateRow.dimensionSize ??
							productToUpdate.dimensions?.size ??
							null,
						height: productFileUploadTemplateRow.dimensionHeight
							? +productFileUploadTemplateRow.dimensionHeight
							: productToUpdate.dimensions?.height ?? null,
						width: productFileUploadTemplateRow.dimensionWidth
							? +productFileUploadTemplateRow.dimensionWidth
							: productToUpdate.dimensions?.width ?? null,
						length: productFileUploadTemplateRow.dimensionLength
							? +productFileUploadTemplateRow.dimensionLength
							: productToUpdate.dimensions?.length ?? null,
						depth: productFileUploadTemplateRow.dimensionDepth
							? +productFileUploadTemplateRow.dimensionDepth
							: productToUpdate.dimensions?.depth ?? null,
						diameter: productFileUploadTemplateRow.dimensionDiameter
							? +productFileUploadTemplateRow.dimensionDiameter
							: productToUpdate.dimensions?.diameter ?? null,
						thickness: productFileUploadTemplateRow.dimensionThickness
							? +productFileUploadTemplateRow.dimensionThickness
							: productToUpdate.dimensions?.thickness ?? null,
						volume: productFileUploadTemplateRow.dimensionVolume
							? +productFileUploadTemplateRow.dimensionVolume
							: productToUpdate.dimensions?.volume ?? null,
						weight: productFileUploadTemplateRow.dimensionWeight
							? +productFileUploadTemplateRow.dimensionWeight
							: productToUpdate.dimensions?.weight ?? null,
					};

					const updatedProduct: IProduct = await this.updateOne(
						{
							_id: new Types.ObjectId(productToUpdate._id),
						},
						{
							$set: productToUpdate,
						},
						{
							new: true,
						},
					);

					if (updatedProduct) {
						await this._productItemsService.updateDefaultProductItem(
							updatedProduct,
						);
					}
				} else {
					productsToCreate.push({
						name: productFileUploadTemplateRow.name,
						dynamicFields: [],
						tagsIds: tagsIds as any[],
						storeIds: storeIds as any[],
						createdAt: now,
						updatedAt: now,
						userId: userId as any,
						price: productFileUploadTemplateRow.price?.toString()?.length
							? +productFileUploadTemplateRow.price
							: 0,
						quantity: productFileUploadTemplateRow.quantity?.toString()?.length
							? +productFileUploadTemplateRow.quantity
							: 0,
						isActive: productFileUploadTemplateRow.isActive?.trim()
							? productFileUploadTemplateRow.isActive?.toUpperCase() ===
							  CommonEnum.YesNo.YES
							: true,
						barcode: valueOrCreateUniqueSuffix(
							productFileUploadTemplateRow.barcode,
						),
						sku: valueOrCreateUniqueSuffix(productFileUploadTemplateRow.sku),
						categoriesIds: categoriesIds as any[],
						description: productFileUploadTemplateRow.description,
						details: productFileUploadTemplateRow.details,
						filesUrl: [],
						mainUrl: null,
						QRCode: null,
						uploadFilename: filename,
						previousBarcodes: [],
						brand: productFileUploadTemplateRow.brand || null,
						historicPrices: [],
						releaseDate: productFileUploadTemplateRow.releaseDate
							? parseToDate(productFileUploadTemplateRow.releaseDate)
							: null,
						expirationDate: productFileUploadTemplateRow.expirationDate
							? parseToDate(productFileUploadTemplateRow.expirationDate)
							: null,
						colors: productFileUploadTemplateRow.colors?.trim()
							? productFileUploadTemplateRow.colors
									.split(',')
									.map((c) => c.trim())
									.filter((c) => c)
							: [],
						dimensions: {
							size: productFileUploadTemplateRow.dimensionSize || null,
							height: productFileUploadTemplateRow.dimensionHeight
								? +productFileUploadTemplateRow.dimensionHeight
								: null,
							width: productFileUploadTemplateRow.dimensionWidth
								? +productFileUploadTemplateRow.dimensionWidth
								: null,
							length: productFileUploadTemplateRow.dimensionLength
								? +productFileUploadTemplateRow.dimensionLength
								: null,
							depth: productFileUploadTemplateRow.dimensionDepth
								? +productFileUploadTemplateRow.dimensionDepth
								: null,
							diameter: productFileUploadTemplateRow.dimensionDiameter
								? +productFileUploadTemplateRow.dimensionDiameter
								: null,
							thickness: productFileUploadTemplateRow.dimensionThickness
								? +productFileUploadTemplateRow.dimensionThickness
								: null,
							volume: productFileUploadTemplateRow.dimensionVolume
								? +productFileUploadTemplateRow.dimensionVolume
								: null,
							weight: productFileUploadTemplateRow.dimensionWeight
								? +productFileUploadTemplateRow.dimensionWeight
								: null,
						},
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

		if (productsToCreate.length > 0) {
			const createdProducts: IProduct[] =
				await this._productModel.create(productsToCreate);

			await this._productItemsService.createDefaultProductItems(
				createdProducts,
			);
		}

		return fileUploadTemplateErrorRows;
	}

	private async _getTagsByProductFileUploadTemplateRow(
		tagsFromRow: string,
		userId: string,
		tagsFromUser: ITag[] = [],
		tagsIdsFromProduct: string[] = [],
	): Promise<string[]> {
		if (!tagsFromRow?.trim()) {
			return tagsIdsFromProduct;
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
					if (!includes(tagsIdsFromProduct, tagIdFromUser)) {
						tagsIdsFromProduct.push(tagIdFromUser);
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
					tagsIdsFromProduct.push(tagCreated._id);
				}
			} catch (error: any) {
				this._logger.error(error);
			}
		}

		return tagsIdsFromProduct;
	}

	private async _getCategoriesByProductFileUploadTemplateRow(
		categoriesFromRow: string,
		userId: string,
		categoriesFromUser: ICategory[] = [],
		categoriesIdsFromProduct: string[] = [],
	): Promise<string[]> {
		if (!categoriesFromRow?.trim()) {
			return categoriesIdsFromProduct;
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
					if (!includes(categoriesIdsFromProduct, categoryIdFromUser)) {
						categoriesIdsFromProduct.push(categoryIdFromUser);
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
					categoriesIdsFromProduct.push(categoryCreated._id);
				}
			} catch (error: any) {
				this._logger.error(error);
			}
		}

		return categoriesIdsFromProduct;
	}

	private async _getStoresByProductFileUploadTemplateRow(
		storesFromRow: string,
		storesFromUser: IStore[] = [],
		storesIdsFromProduct: string[] = [],
	): Promise<string[]> {
		if (!storesFromRow?.trim()) {
			return storesIdsFromProduct;
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
					if (!includes(storesIdsFromProduct, storeIdFromUser)) {
						storesIdsFromProduct.push(storeIdFromUser);
					}
				}
			} catch (error: any) {
				this._logger.error(error);
			}
		}

		return storesIdsFromProduct;
	}

	// #endregion
}

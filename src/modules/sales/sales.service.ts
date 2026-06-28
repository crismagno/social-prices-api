import { isNumber } from 'class-validator';
import * as ExcelJS from 'exceljs';
import {
	filter,
	find,
	flatMap,
	forEach,
	includes,
	isArray,
	map,
	orderBy,
	reduce,
	uniq,
} from 'lodash';
import * as moment from 'moment-timezone';
import mongoose, { FilterQuery, Model, PipelineStage } from 'mongoose';

import {
	BadRequestException,
	Injectable,
	InternalServerErrorException,
	Logger,
	NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { schemasName } from '../../infra/database/mongo/schemas';
import HashCrypt from '../../infra/hash-crypt/hash-crypt';
import AddressEnum from '../../shared/common/address/address.enum';
import { IAddress } from '../../shared/common/address/address.interface';
import { CreateAddressDto } from '../../shared/common/address/CreateAddress.dto';
import CommonEnum from '../../shared/common/global/common.enum';
import PersonEnum from '../../shared/common/person/person.enum';
import PhoneNumberEnum from '../../shared/common/phone/phone-number.enum';
import { IPhoneNumber } from '../../shared/common/phone/phone-number.interface';
import { parseToChartDataPeriodTypeItem } from '../../shared/utils/charts/charts';
import ChartsEnum from '../../shared/utils/charts/charts-enum';
import {
	IChartDataPeriodTypeItem,
	IChartDataProductItem,
	IChartDateTotalItem,
	IChartTotalAndQuantity,
} from '../../shared/utils/charts/charts-types';
import DatesEnum from '../../shared/utils/dates/dates.enum';
import { parseToDate } from '../../shared/utils/dates/dates.utils';
import {
	createUsernameByName,
	isValidEmail,
} from '../../shared/utils/global/global';
import { countries } from '../../shared/utils/mock-data/countries';
import {
	ICountryMockData,
	IStateMockData,
} from '../../shared/utils/mock-data/interfaces';
import { states } from '../../shared/utils/mock-data/states';
import {
	getPercentageByValue,
	getValueByPercentage,
} from '../../shared/utils/numbers/numbers';
import { parseAnyStringToObject } from '../../shared/utils/objects/objects';
import { generatePdfBuffer } from '../../shared/utils/pdf/pdf';
import { arrayStringToObjectId } from '../../shared/utils/strings/strings';
import {
	queryOptions,
	queryOptionsBySort,
} from '../../shared/utils/table/table-state';
import {
	ITableStateRequest,
	ITableStateResponse,
} from '../../shared/utils/table/table-state.interface';
import TemplatesEnum from '../../shared/utils/templates/templates.enum';
import { CountersService } from '../counters/counters.service';
import { CustomersService } from '../customers/customers.service';
import { ICustomer } from '../customers/interfaces/customer.interface';
import CreateCustomerDto from '../customers/interfaces/dto/createCustomer.dto';
import { EmployeesService } from '../employees/employees.service';
import { IEmployee } from '../employees/interfaces/employee.interface';
import { FilesUploadsService } from '../files-uploads/files-uploads.service';
import { IFileUpload } from '../files-uploads/interfaces/file-upload.interface';
import FilesUploadsEnum from '../files-uploads/interfaces/files-uploads.enum';
import {
	IFileUploadTemplateError,
	IFileUploadTemplateErrorRow,
} from '../files-uploads/interfaces/files-uploads.type';
import { FilesService } from '../files/files-service';
import { NotificationsService } from '../notifications/notifications.service';
import { IProductItem } from '../product-items/interfaces/product-item.interface';
import { ProductItemsService } from '../product-items/product-items.service';
import { IProduct } from '../products/interfaces/product.interface';
import { ProductsService } from '../products/products.service';
import { SocketsGateway } from '../sockets/sockets.gateway';
import { IStore } from '../stores/interfaces/store.interface';
import { StoresService } from '../stores/stores.service';
import TagsEnum from '../tags/interfaces/tags.enum';
import { ITag } from '../tags/interfaces/tags.interface';
import { TagsService } from '../tags/tags.service';
import { IUser } from '../users/interfaces/user.interface';
import { UsersService } from '../users/users.service';
import CompleteMultipleSalesManualDto from './interfaces/dto/completeMultipleSalesManual.dto';
import CreateSaleDto, {
	SaleStoreDto,
	SaleStoreProductDto,
} from './interfaces/dto/createSale.dto';
import UpdateSaleDto from './interfaces/dto/updateSale.dto';
import UpdateSaleCustomerManualDto from './interfaces/dto/updateSaleCustomerManual.dto';
import UpdateSaleFilesDto from './interfaces/dto/updateSaleFiles.dto';
import UpdateSalePaymentStatusManualDto from './interfaces/dto/updateSalePaymentStatusManual.dto';
import UpdateSaleStatusManualDto from './interfaces/dto/updateSaleStatusManual.dto';
import {
	ISale,
	ISalePayment,
	ISaleStore,
	ISaleStoreProduct,
} from './interfaces/sale.interface';
import { Sale } from './interfaces/sale.schema';
import SalesEnum from './interfaces/sales.enum';
import {
	IFiltersDownloadSales,
	IGetSalesAnalyticsParams,
	IGetSalesAnalyticsResponse,
	IGetSalesBalanceParams,
	IGetSalesBalanceResponse,
	IGetSalesProductBalanceResponse,
	IGetSalesSummaryByUserTableStateResponse,
	IProductToSubtract,
	ISaleFileUploadTemplateRow,
	ISaleFileUploadTemplateRowPaymentFormat,
	ISaleFileUploadTemplateSelectedProductFormat,
	ISaleFileUploadTemplateSelectedProductItemFormat,
	ISalePdf,
	ISaleStoreProductString,
	ISaleStoresProductsTotals,
	ISaleToCreateByUpload,
	ISendSaleSummaryLinkRequest,
	ISubtotalAndTotalFinalAmount,
	ITotalsProcessedFileUploadTemplateRows,
} from './interfaces/sales.type';
import {
	getSaleSummaryTemplate,
	ISaleSummaryTemplate,
} from './interfaces/template/sale-summary.template';
import { SalesValidationService } from './sales-validation.service';
import { parsePopulatedSale, parsePopulatedSales } from './sales.utils';

@Injectable()
export class SalesService {
	// #region Private Properties

	private readonly _logger: Logger;

	// #endregion

	// #region Constructor

	constructor(
		@InjectModel(schemasName.sale)
		private readonly _saleModel: Model<Sale>,
		private readonly _usersService: UsersService,
		private readonly _notificationsService: NotificationsService,
		private readonly _storesService: StoresService,
		private readonly _customersService: CustomersService,
		private readonly _productsService: ProductsService,
		private readonly _productItemsService: ProductItemsService,
		private readonly _countersService: CountersService,
		private readonly _salesValidationService: SalesValidationService,
		private readonly _tagsService: TagsService,
		private readonly _socketsGateway: SocketsGateway,
		private readonly _filesUploadsService: FilesUploadsService,
		private readonly _filesService: FilesService,
		private readonly _employeesService: EmployeesService,
		private readonly _hashCrypt: HashCrypt,
	) {
		this._logger = new Logger(SalesService.name);
	}

	// #endregion

	// #region Public Methods

	public async findById(saleId: string): Promise<ISale | null> {
		let sale: ISale | null = await this._saleModel.findById(saleId);

		if (!sale) {
			return null;
		}

		sale = await this._saleModel
			.findById(saleId)
			.populate({
				path: 'createdByEmployeeId',
				model: 'Employee',
			})
			.populate({
				path: 'updatedByEmployeeId',
				model: 'Employee',
			})
			.populate({
				path: 'stores.products.productItemId',
				model: 'ProductItem',
			});

		if (!sale) {
			throw new NotFoundException('Sale not found!');
		}

		const salePopulated: ISale = parsePopulatedSale(sale);

		salePopulated.user = await this._usersService.findOneById(
			salePopulated.stores?.[0]?.store?.userId?.toString(),
		);

		return salePopulated;
	}

	public async countByUserId(userId: string): Promise<number> {
		const storesIds: string[] =
			await this._storesService.findStoreIdsByUserId(userId);

		return this._saleModel.countDocuments({
			$or: [
				{ createdByUserId: userId },
				{
					'stores.storeId': { $in: storesIds },
				},
			],
		});
	}

	public async findByIdOrFail(saleId: string): Promise<ISale> {
		const sale: ISale | null = await this.findById(saleId);

		if (!sale) {
			throw new NotFoundException('Sale not found!');
		}

		return sale;
	}

	public async findFilledByIdOrFail(saleId: string): Promise<ISale> {
		const sale: ISale | null = await this._saleModel
			.findById(saleId)
			.populate({
				path: 'stores.customerId',
				model: 'Customer',
			})
			.populate({
				path: 'stores.products.productId',
				model: 'Product',
			})
			.populate({
				path: 'stores.products.productItemId',
				model: 'ProductItem',
			})
			.populate({
				path: 'stores.storeId',
				model: 'Store',
			})
			.populate({
				path: 'createdByEmployeeId',
				model: 'Employee',
			})
			.populate({
				path: 'updatedByEmployeeId',
				model: 'Employee',
			});

		if (!sale) {
			throw new NotFoundException('Sale not found!');
		}

		const salePopulated: ISale = parsePopulatedSale(sale);

		salePopulated.user = await this._usersService.findOneById(
			salePopulated.stores?.[0]?.store?.userId?.toString(),
		);

		return salePopulated;
	}

	public async findByUserId(userId: string): Promise<ISale[]> {
		const storesIds: string[] =
			await this._storesService.findStoreIdsByUserId(userId);

		const sales: ISale[] = await this._saleModel.find({
			$or: [
				{ createdByUserId: userId },
				{
					'stores.storeId': { $in: storesIds },
				},
			],
		});

		return sales;
	}

	public async findByUserTableState(
		userId: string,
		tableState: ITableStateRequest<ISale>,
	): Promise<ITableStateResponse<ISale[]>> {
		const storesIds: string[] =
			await this._storesService.findStoreIdsByUserId(userId);

		const filter: FilterQuery<ISale> = {
			$or: [
				{ createdByUserId: userId },
				{
					'stores.storeId': { $in: storesIds },
				},
			],
		};

		if (tableState.search) {
			const search = new RegExp(tableState.search, 'ig');

			filter.$or = [
				{
					description: search,
				},
				{
					'buyer.name': search,
				},
				{
					'buyer.email': search,
				},
				{
					numberManual: search,
				},
			];

			if (isNumber(+tableState.search)) {
				filter.$or.push({
					number: +tableState.search,
				});
			}
		}

		if (tableState.filters?.type?.length) {
			filter.type = { $in: tableState.filters.type };
		}

		if (tableState.filters?.status?.length) {
			filter.status = { $in: tableState.filters.status };
		}

		if (tableState.filters?.paymentStatus?.length) {
			filter.paymentStatus = { $in: tableState.filters.paymentStatus };
		}

		if (tableState.filters?.deliveryType?.length) {
			filter['header.deliveryType'] = { $in: tableState.filters.deliveryType };
		}

		if (tableState.filters?.stores?.length) {
			filter['stores.storeId'] = { $in: tableState.filters.stores };
		}

		if (tableState.filters?.rangeDate) {
			const { startDate, endDate } = tableState.filters.rangeDate;
			const filterRangeField: string =
				tableState.filters?.rangeField ?? 'createdAt';

			filter[filterRangeField] = {
				$gte: new Date(startDate),
				$lte: new Date(endDate),
			};
		}

		if (tableState?.filters?.tagsIds?.length) {
			filter.tagsIds = { $in: tableState.filters.tagsIds };
		}

		if (tableState.filters?.productIds?.length) {
			filter['stores.products.productId'] = {
				$in: tableState.filters?.productIds,
			};
		}

		if (tableState.filters?.productItemIds?.length) {
			filter['stores.products.productItemId'] = {
				$in: tableState.filters?.productItemIds,
			};
		}

		if (tableState.filters?.customerIds?.length) {
			filter['stores.customerId'] = { $in: tableState.filters.customerIds };
		}

		if (tableState.filters?.isActive?.length === 1) {
			filter.softDelete = tableState.filters?.isActive[0]
				? null
				: { $ne: null };
		}

		if (tableState.filters?.employeeIds?.length) {
			filter.createdByEmployeeId = { $in: tableState.filters.employeeIds };
		}

		const response: ITableStateResponse<ISale[]> = {
			data: [],
			total: 0,
		};

		response.total = await this._saleModel.countDocuments(filter);

		const sales: ISale[] = await this._saleModel
			.find(filter, null, queryOptions<ISale>(tableState))
			.populate({
				path: 'stores.customerId',
				model: 'Customer',
			})
			.populate({
				path: 'stores.products.productId',
				model: 'Product',
			})
			.populate({
				path: 'stores.products.productItemId',
				model: 'ProductItem',
			});

		response.data = parsePopulatedSales(sales);

		return response;
	}

	public async getSalesSummaryByUserTableState(
		userId: string,
		tableState: ITableStateRequest<ISale>,
	): Promise<IGetSalesSummaryByUserTableStateResponse> {
		const storesIds: string[] =
			await this._storesService.findStoreIdsByUserId(userId);

		const filter: FilterQuery<ISale> = {
			$or: [
				{ createdByUserId: new mongoose.Types.ObjectId(userId) },
				{
					'stores.storeId': { $in: arrayStringToObjectId(storesIds) },
				},
			],
		};

		if (tableState.search) {
			const search = new RegExp(tableState.search, 'ig');

			filter.$or = [
				{
					description: search,
				},
				{
					'buyer.name': search,
				},
				{
					'buyer.email': search,
				},
				{
					numberManual: search,
				},
			];

			if (isNumber(+tableState.search)) {
				filter.$or.push({
					number: +tableState.search,
				});
			}
		}

		if (tableState.filters?.type?.length) {
			filter.type = { $in: tableState.filters.type };
		}

		if (tableState.filters?.status?.length) {
			filter.status = { $in: tableState.filters.status };
		}

		if (tableState.filters?.paymentStatus?.length) {
			filter.paymentStatus = { $in: tableState.filters.paymentStatus };
		}

		if (tableState.filters?.deliveryType?.length) {
			filter['header.deliveryType'] = { $in: tableState.filters.deliveryType };
		}

		if (tableState.filters?.stores?.length) {
			filter['stores.storeId'] = {
				$in: arrayStringToObjectId(tableState.filters.stores),
			};
		}

		if (tableState.filters?.rangeDate) {
			const { startDate, endDate } = tableState.filters.rangeDate;
			const filterRangeField: string =
				tableState.filters?.rangeField ?? 'createdAt';

			filter[filterRangeField] = {
				$gte: new Date(startDate),
				$lte: new Date(endDate),
			};
		}

		if (tableState?.filters?.tagsIds?.length) {
			filter.tagsIds = {
				$in: arrayStringToObjectId(tableState.filters.tagsIds),
			};
		}

		if (tableState.filters?.productIds?.length) {
			filter['stores.products.productId'] = {
				$in: arrayStringToObjectId(tableState.filters?.productIds),
			};
		}

		if (tableState.filters?.customerIds?.length) {
			filter['stores.customerId'] = {
				$in: arrayStringToObjectId(tableState.filters.customerIds),
			};
		}

		if (tableState.filters?.isActive?.length === 1) {
			filter.softDelete = tableState.filters?.isActive[0]
				? null
				: { $ne: null };
		}

		if (tableState.filters?.employeeIds?.length) {
			filter.createdByEmployeeId = { $in: tableState.filters.employeeIds };
		}

		const pipeline: PipelineStage[] = [
			{ $match: filter },
			{
				$group: {
					_id: null,
					subtotal: { $sum: { $ifNull: ['$totals.subtotalAmount', 0] } },
					tax: { $sum: { $ifNull: ['$totals.tax.amount', 0] } },
					discount: {
						$sum: { $ifNull: ['$totals.discount.distributed.amount', 0] },
					},
					shipping: { $sum: { $ifNull: ['$totals.shipping.amount', 0] } },
					totalFinal: { $sum: { $ifNull: ['$totals.totalFinalAmount', 0] } },
				},
			},
		];

		const [
			salesSummary = {
				subtotal: 0,
				tax: 0,
				discount: 0,
				shipping: 0,
				totalFinal: 0,
			} as IGetSalesSummaryByUserTableStateResponse,
		] = await this._saleModel.aggregate(pipeline).exec();

		return salesSummary;
	}

	public async createManual(createSaleDto: CreateSaleDto): Promise<ISale> {
		try {
			if (!createSaleDto.createdByUserId) {
				throw new BadRequestException('User which created sale is required!');
			}

			if (!createSaleDto.createdByEmployeeId) {
				throw new BadRequestException(
					'Employee which created sale is required!',
				);
			}

			const saleNumber: number =
				await this._countersService.findNextNumberBySaleType();

			const storeIds: string[] = map(createSaleDto.stores, 'storeId');

			const stores: IStore[] = await this._storesService.findByIds(storeIds);

			const saleStores: ISaleStore[] =
				await this._processSaleStoresDtoToSaleStores(
					createSaleDto,
					saleNumber,
					stores,
				);

			const now: Date = new Date();

			const saleToCreate: ISale = {
				isSendCustomerNotifications: createSaleDto.isSendCustomerNotifications,
				previousCustomerIds: [],
				createdDate: createSaleDto.createdDate ?? now,
				buyer: createSaleDto.buyer
					? {
							address: this._parseCreateAddressDtoToAddress(
								createSaleDto.buyer.address,
							),
							birthDate: createSaleDto.buyer.birthDate,
							email: createSaleDto.buyer.email,
							gender: createSaleDto.buyer.gender,
							name: createSaleDto.buyer.name,
							phoneNumber: createSaleDto.buyer.phoneNumber,
							userId: createSaleDto.buyer.userId as any,
					  }
					: null,
				createdAt: now,
				updatedAt: now,
				createdByUserId: createSaleDto.createdByUserId as any,
				header: {
					billing: createSaleDto.header.billing
						? {
								address: this._parseCreateAddressDtoToAddress(
									createSaleDto.header.billing.address,
								),
						  }
						: null,
					shipping: createSaleDto.header.shipping
						? {
								address: this._parseCreateAddressDtoToAddress(
									createSaleDto.header.shipping.address,
								),
						  }
						: null,
					deliveryType: createSaleDto.header.deliveryType,
				},
				note: createSaleDto.note,
				number: saleNumber,
				payments: createSaleDto.payments,
				status: createSaleDto.status,
				stores: saleStores,
				totals: createSaleDto.totals,
				type: createSaleDto.type,
				paymentStatus: createSaleDto.paymentStatus,
				tagsIds: createSaleDto.tagsIds as any[],
				createdByEmployeeId: createSaleDto.createdByEmployeeId as any,
				softDelete: null,
				updatedByEmployeeId: null,
				updatedByUserId: null,
				_id: new mongoose.Types.ObjectId() as any,
				deliveryAt: createSaleDto.deliveryAt,
				uploadFilename: null,
				numberManual: createSaleDto.numberManual,
				filesUrl: [],
				noteToCustomer: createSaleDto.noteToCustomer,
				completedAt:
					createSaleDto.status === SalesEnum.Status.COMPLETED ? now : null,
			};

			const saleModel = new this._saleModel(saleToCreate);

			const newSale = await saleModel.save();

			await this._subtractProductsQuantityBySaleStores(saleStores);

			const userIdByStores: string = stores[0].userId.toString();

			const user: IUser =
				await this._usersService.findOneByIdOrFail(userIdByStores);

			await this._notificationsService.createdManualSale(newSale, user);

			if (newSale.status === SalesEnum.Status.COMPLETED) {
				newSale.completedAt = new Date();
				await this._completeSaleStoresProducts(newSale._id.toString());

				const employee: IEmployee = await this._employeesService.findByIdOrFail(
					createSaleDto.createdByEmployeeId,
				);

				await this._notificationsService.completedSale(newSale, user, employee);
			}

			return newSale;
		} catch (error: any) {
			this._logger.error(error);

			throw new BadRequestException(error);
		}
	}

	public async updateManual(updateSaleDto: UpdateSaleDto): Promise<ISale> {
		try {
			if (!updateSaleDto.updatedByUserId) {
				throw new BadRequestException('User which updated sale is required!');
			}

			if (!updateSaleDto.updatedByEmployeeId) {
				throw new BadRequestException(
					'Employee which updated sale is required!',
				);
			}

			const sale: ISale = await this.findByIdOrFail(updateSaleDto.saleId);

			const storeIds: string[] = map(updateSaleDto.stores, 'storeId');

			const stores: IStore[] = await this._storesService.findByIds(storeIds);

			const saleStores: ISaleStore[] =
				this._parseCreateSaleStoresDtoToSaleStores(
					updateSaleDto.stores,
					sale.number,
				);

			const now: Date = new Date();

			const saleToUpdate = {
				buyer: updateSaleDto.buyer
					? {
							address: this._parseCreateAddressDtoToAddress(
								updateSaleDto.buyer.address,
							),
							birthDate: updateSaleDto.buyer.birthDate,
							email: updateSaleDto.buyer.email,
							gender: updateSaleDto.buyer.gender,
							name: updateSaleDto.buyer.name,
							phoneNumber: updateSaleDto.buyer.phoneNumber,
							userId: updateSaleDto.buyer.userId,
					  }
					: null,
				updatedAt: now,
				updatedByUserId: updateSaleDto.updatedByUserId as any,
				header: {
					billing: updateSaleDto.header.billing
						? {
								address: this._parseCreateAddressDtoToAddress(
									updateSaleDto.header.billing.address,
								),
						  }
						: null,
					shipping: updateSaleDto.header.shipping
						? {
								address: this._parseCreateAddressDtoToAddress(
									updateSaleDto.header.shipping.address,
								),
						  }
						: null,
					deliveryType: updateSaleDto.header.deliveryType,
				},
				note: updateSaleDto.note,
				payments: updateSaleDto.payments,
				status: updateSaleDto.status,
				stores: saleStores,
				totals: updateSaleDto.totals,
				type: updateSaleDto.type,
				paymentStatus: updateSaleDto.paymentStatus,
				tagsIds: updateSaleDto.tagsIds as any[],
				updatedByEmployeeId: updateSaleDto.updatedByEmployeeId as any,
				deliveryAt: updateSaleDto.deliveryAt,
				createdDate:
					updateSaleDto.createdDate ?? sale.createdDate ?? sale.createdAt,
				numberManual: updateSaleDto.numberManual,
				noteToCustomer: updateSaleDto.noteToCustomer,
				isSendCustomerNotifications: updateSaleDto.isSendCustomerNotifications,
			};

			if (
				sale.status !== SalesEnum.Status.COMPLETED &&
				updateSaleDto.status === SalesEnum.Status.COMPLETED
			) {
				saleToUpdate['completedAt'] = now;
			}

			const updatedSale: ISale = await this._saleModel.findByIdAndUpdate(
				updateSaleDto.saleId,
				{
					$set: saleToUpdate,
				},
				{ new: true },
			);

			await this._updateProductsQuantityByUpdateManualSale(
				updateSaleDto.stores,
				sale.stores,
			);

			const userIdByStores: string = stores[0].userId.toString();

			const user: IUser =
				await this._usersService.findOneByIdOrFail(userIdByStores);

			if (
				sale.status !== SalesEnum.Status.COMPLETED &&
				updatedSale.status === SalesEnum.Status.COMPLETED
			) {
				await this._completeSaleStoresProducts(updatedSale._id.toString());

				const employee: IEmployee = await this._employeesService.findByIdOrFail(
					updateSaleDto.updatedByEmployeeId,
				);

				await this._notificationsService.completedSale(
					updatedSale,
					user,
					employee,
				);
			} else {
				await this._notificationsService.updatedManualSale(updatedSale, user);
			}

			return updatedSale;
		} catch (error: any) {
			this._logger.error(error);

			throw new BadRequestException(error);
		}
	}

	public async updateSaleFiles(
		updateSaleFilesDto: UpdateSaleFilesDto,
		files: Express.Multer.File[],
	): Promise<ISale> {
		try {
			const sale: ISale = await this.findByIdOrFail(updateSaleFilesDto.saleId);

			if (typeof updateSaleFilesDto.deletedFilesUrl === 'string') {
				updateSaleFilesDto.deletedFilesUrl = JSON.parse(
					updateSaleFilesDto.deletedFilesUrl,
				);

				if (updateSaleFilesDto.deletedFilesUrl.length) {
					await this._filesService.deleteFiles(
						updateSaleFilesDto.deletedFilesUrl,
					);
				}
			}

			if (
				files.length === 0 &&
				updateSaleFilesDto.deletedFilesUrl.length === 0
			) {
				return sale;
			}

			const filesUrl: string[] =
				await this._filesService.getUploadFilesUrl(files);

			sale.filesUrl = sale.filesUrl.filter(
				(fileUrl: string) =>
					!updateSaleFilesDto.deletedFilesUrl.find(
						(deletedFileUrl: string) => deletedFileUrl === fileUrl,
					),
			);

			sale.filesUrl.push(...filesUrl);

			const now: Date = new Date();

			const saleToUpdate = {
				filesUrl: sale.filesUrl,
				updatedAt: now,
			};

			const updatedSale: ISale = await this._saleModel.findByIdAndUpdate(
				updateSaleFilesDto.saleId,
				{
					$set: saleToUpdate,
				},
				{ new: true },
			);

			return updatedSale;
		} catch (error: any) {
			this._logger.error(error);

			throw new BadRequestException(error);
		}
	}

	public async deleteManual(
		saleId: string,
		userId: string,
		employeeId?: string,
	): Promise<ISale> {
		try {
			if (!saleId) {
				throw new BadRequestException('SaleId is required!');
			}

			const sale: ISale = await this._saleModel.findOneAndUpdate(
				{ _id: new mongoose.Types.ObjectId(saleId) },
				{
					$set: {
						softDelete: {
							isDeleted: true,
							deletedAt: new Date(),
							deletedByUserId: new mongoose.Types.ObjectId(userId),
							deletedByEmployeeId: employeeId
								? new mongoose.Types.ObjectId(employeeId)
								: null,
						},
					},
				},
				{
					new: true,
				},
			);

			const userIdOwnerStore: IUser =
				await this._usersService.findOneByIdOrFail(userId);

			await this._notificationsService.deletedSale(sale, userIdOwnerStore);

			return sale;
		} catch (error: any) {
			this._logger.error(error);

			throw new BadRequestException(error);
		}
	}

	public async activateManual(
		saleId: string,
		userId: string,
		employeeId?: string,
	): Promise<ISale> {
		try {
			if (!saleId) {
				throw new BadRequestException('SaleId is required!');
			}

			const sale: ISale = await this._saleModel.findOneAndUpdate(
				{ _id: new mongoose.Types.ObjectId(saleId) },
				{
					$set: {
						softDelete: null,
						updatedAt: new Date(),
						updatedByUserId: new mongoose.Types.ObjectId(userId),
						updatedByEmployeeId: employeeId
							? new mongoose.Types.ObjectId(employeeId)
							: null,
					},
				},
				{
					new: true,
				},
			);

			const userIdOwnerStore: IUser =
				await this._usersService.findOneByIdOrFail(userId);

			await this._notificationsService.activatedSale(sale, userIdOwnerStore);

			return sale;
		} catch (error: any) {
			this._logger.error(error);

			throw new BadRequestException(error);
		}
	}

	public async getSalesAnalytics(
		userId: string,
		params: IGetSalesAnalyticsParams,
	): Promise<IGetSalesAnalyticsResponse> {
		const storesIds: string[] = params.storesIds?.length
			? params.storesIds
			: await this._storesService.findStoreIdsByUserId(userId);

		const filter: FilterQuery<ISale> = {
			'stores.storeId': { $in: storesIds },
		};

		if (params.types?.length) {
			filter.type = { $in: params.types };
		}

		if (params.status?.length) {
			filter.status = { $in: params.status };
		}

		if (params.rangeDate) {
			const { startDate, endDate } = params.rangeDate;
			filter.createdDate = { $gte: startDate, $lte: endDate };
		}

		if (params.tagsIds?.length) {
			filter.tagsIds = { $in: params.tagsIds };
		}

		if (params.productIds?.length) {
			filter['stores.products.productId'] = { $in: params.productIds };
		}

		if (params.productItemIds?.length) {
			filter['stores.products.productItemId'] = { $in: params.productItemIds };
		}

		if (params.customerIds?.length) {
			filter['stores.customerId'] = { $in: params.customerIds };
		}

		if (params.paymentStatus?.length) {
			filter.paymentStatus = { $in: params.paymentStatus };
		}

		if (params.deliveryTypes?.length) {
			filter['header.deliveryType'] = { $in: params.deliveryTypes };
		}

		if (params.employeeIds?.length) {
			filter.createdByEmployeeId = { $in: params.employeeIds };
		}

		const sales: ISale[] = await this._saleModel.find(filter);

		const chartDataPeriodType: IChartDataPeriodTypeItem[] =
			this._parseSalesToChartDataPeriodType(
				sales,
				storesIds,
				params.periodType,
				params.productIds,
				params.productItemIds,
			);

		const chartDataProducts = await this._parseSalesToChartDataProducts(
			sales,
			storesIds,
			params.productIds,
			params.productItemIds,
		);

		return {
			chartDataPeriodType,
			...chartDataProducts,
		};
	}

	public async getSalesBalance(
		userId: string,
		params: IGetSalesBalanceParams,
	): Promise<IGetSalesBalanceResponse> {
		const storesIds: string[] = params.storeId
			? [params.storeId]
			: await this._storesService.findStoreIdsByUserId(userId);

		const filter: FilterQuery<ISale> = {
			'stores.storeId': { $in: storesIds },
			status: { $in: SalesEnum.StatusToFilterCharts },
		};

		if (params.rangeDate) {
			const { startDate, endDate } = params.rangeDate;
			filter.createdDate = { $gte: startDate, $lte: endDate };
		}

		if (params.customerId) {
			filter['stores.customerId'] = params.customerId;
		}

		if (params.productIds?.length) {
			filter['stores.products.productId'] = { $in: params.productIds };
		}

		if (params.productItemIds?.length) {
			filter['stores.products.productItemId'] = { $in: params.productItemIds };
		}

		if (params.employeeIds?.length) {
			filter.createdByEmployeeId = { $in: params.employeeIds };
		}

		const sales: ISale[] = await this._saleModel.find(filter);

		return this._parseSalesToSalesBalance({
			sales,
			storeId: params.storeId,
			productIds: params.productIds,
			productItemIds: params.productItemIds,
		});
	}

	public async findByNumberManual(numberManual: string): Promise<ISale | null> {
		return this._saleModel.findOne({
			numberManual,
		});
	}

	public async updateStatusManual(
		updateSaleStatusManualDto: UpdateSaleStatusManualDto,
		userId: string,
		employeeId?: string,
	): Promise<ISale> {
		try {
			const now: Date = new Date();

			const $set = {
				status: updateSaleStatusManualDto.newStatus,
				updatedAt: now,
				updatedByUserId: new mongoose.Types.ObjectId(userId),
				updatedByEmployeeId: employeeId
					? new mongoose.Types.ObjectId(employeeId)
					: null,
			};

			if (updateSaleStatusManualDto.newStatus === SalesEnum.Status.COMPLETED) {
				$set['completedAt'] = now;
			}

			const updatedSale: ISale = await this._saleModel.findOneAndUpdate(
				{ _id: new mongoose.Types.ObjectId(updateSaleStatusManualDto.saleId) },
				{
					$set: $set,
				},
				{
					new: true,
				},
			);

			if (updatedSale.status === SalesEnum.Status.COMPLETED) {
				await this._completeSaleStoresProducts(updatedSale._id.toString());

				const userIdOwnerStore: IUser =
					await this._usersService.findOneByIdOrFail(userId);

				const employee: IEmployee =
					await this._employeesService.findByIdOrFail(employeeId);

				await this._notificationsService.completedSale(
					updatedSale,
					userIdOwnerStore,
					employee,
				);
			}

			return updatedSale;
		} catch (error: any) {
			this._logger.error(error);

			throw new BadRequestException(error);
		}
	}

	public async updatePaymentStatusManual(
		updateSalePaymentStatusManualDto: UpdateSalePaymentStatusManualDto,
		userId: string,
		employeeId?: string,
	): Promise<ISale> {
		try {
			const sale: ISale = await this._saleModel.findOneAndUpdate(
				{
					_id: new mongoose.Types.ObjectId(
						updateSalePaymentStatusManualDto.saleId,
					),
				},
				{
					$set: {
						paymentStatus: updateSalePaymentStatusManualDto.newPaymentStatus,
						updatedAt: new Date(),
						updatedByUserId: new mongoose.Types.ObjectId(userId),
						updatedByEmployeeId: employeeId
							? new mongoose.Types.ObjectId(employeeId)
							: null,
						payments: updateSalePaymentStatusManualDto.newPayments,
					},
				},
				{
					new: true,
				},
			);

			return sale;
		} catch (error: any) {
			this._logger.error(error);

			throw new BadRequestException(error);
		}
	}

	public async updateSaleCustomerManual(
		updateSaleCustomerManualDto: UpdateSaleCustomerManualDto,
		userId: string,
		employeeId?: string,
	): Promise<ISale> {
		try {
			let sale: ISale = await this.findByIdOrFail(
				updateSaleCustomerManualDto.saleId,
			);

			const previousCustomerId: string = sale.stores[0].customerId.toString();

			const newCustomer: ICustomer =
				await this._customersService.findByIdOrFail(
					updateSaleCustomerManualDto.newCustomerId,
				);

			const saleAddress: IAddress | undefined =
				find(newCustomer.addresses, {
					uid: updateSaleCustomerManualDto.newAddressUid,
				}) || sale.buyer.address;

			sale = await this._saleModel.findOneAndUpdate(
				{
					_id: new mongoose.Types.ObjectId(updateSaleCustomerManualDto.saleId),
				},
				{
					$set: {
						buyer: {
							address: saleAddress,
							birthDate: newCustomer.birthDate,
							email: newCustomer.email,
							gender: newCustomer.gender,
							name: newCustomer.name,
							phoneNumber: newCustomer.phoneNumbers[0],
							userId: newCustomer.userId,
						},
						header: {
							billing: sale.header.billing
								? {
										address: saleAddress,
								  }
								: null,
							shipping: sale.header.shipping
								? {
										address: saleAddress,
								  }
								: null,
							deliveryType: sale.header.deliveryType,
						},
						updatedAt: new Date(),
						updatedByUserId: new mongoose.Types.ObjectId(userId),
						updatedByEmployeeId: employeeId
							? new mongoose.Types.ObjectId(employeeId)
							: null,
						stores: map(
							sale.stores,
							(saleStore: ISaleStore): ISaleStore => ({
								number: saleStore.number,
								customerId: newCustomer._id as any,
								products: saleStore.products,
								storeId: saleStore.storeId,
								totals: saleStore.totals,
							}),
						),
					},
					$push: {
						previousCustomerIds: previousCustomerId,
					},
				},
				{
					new: true,
				},
			);

			const userIdOwnerStore: IUser =
				await this._usersService.findOneByIdOrFail(userId);

			await this._notificationsService.updatedCustomerOnSale(
				sale,
				userIdOwnerStore,
			);

			return sale;
		} catch (error: any) {
			this._logger.error(error);

			throw new BadRequestException(error);
		}
	}

	public async completeMultipleSalesManual(
		completeMultipleSalesManualDto: CompleteMultipleSalesManualDto,
		userId: string,
		employeeId?: string,
	): Promise<void> {
		try {
			const salesToComplete: ISale[] = await this._saleModel
				.find(
					{
						_id: {
							$in: arrayStringToObjectId(
								completeMultipleSalesManualDto.saleIds,
							),
						},
						status: { $ne: SalesEnum.Status.COMPLETED },
					},
					{ _id: 1 },
				)
				.lean();

			if (salesToComplete.length === 0) {
				throw new BadRequestException('No sales to complete found!');
			}

			const now: Date = new Date();

			await this._saleModel.updateMany(
				{
					_id: {
						$in: map(salesToComplete, '_id'),
					},
				},
				{
					$set: {
						status: SalesEnum.Status.COMPLETED,
						updatedAt: now,
						updatedByUserId: new mongoose.Types.ObjectId(userId),
						completedAt: now,
						updatedByEmployeeId: employeeId
							? new mongoose.Types.ObjectId(employeeId)
							: null,
					},
				},
				{ multi: true },
			);

			const userIdOwnerStore: IUser =
				await this._usersService.findOneByIdOrFail(userId);

			const employee: IEmployee =
				await this._employeesService.findByIdOrFail(employeeId);

			for await (const saleId of completeMultipleSalesManualDto.saleIds) {
				const sale: ISale = await this._completeSaleStoresProducts(saleId);

				await this._notificationsService.completedSale(
					sale,
					userIdOwnerStore,
					employee,
				);
			}
		} catch (error: any) {
			this._logger.error(error);

			throw new BadRequestException(error);
		}
	}

	// #endregion

	// #region Private Methods

	private async _processSaleStoresDtoToSaleStores(
		createSaleDto: CreateSaleDto,
		saleNumber: number,
		stores: IStore[],
	): Promise<ISaleStore[]> {
		const hasCustomerIdNull: boolean = createSaleDto.stores.some(
			(saleStoreDto: SaleStoreDto) => !saleStoreDto.customerId,
		);

		if (!hasCustomerIdNull) {
			return this._parseCreateSaleStoresDtoToSaleStores(
				createSaleDto.stores,
				saleNumber,
			);
		}

		const createSaleDtoBuyerUserId: string | undefined =
			createSaleDto.buyer?.userId;

		const userByEmail: IUser | undefined =
			createSaleDto.buyer && !createSaleDtoBuyerUserId
				? await this._usersService.findOneByEmail(createSaleDto.buyer.email)
				: undefined;

		const buyerUserId: string | undefined =
			createSaleDtoBuyerUserId ?? userByEmail?._id;

		for await (const createSaleStoreDto of createSaleDto.stores) {
			if (createSaleStoreDto.customerId) continue;

			const store: IStore = find(
				stores,
				(store: IStore) => store._id.toString() === createSaleStoreDto.storeId,
			);

			const storeUserId: string = store.userId.toString();

			let customer: ICustomer | null = null;

			if (!createSaleDto.buyer) {
				// This is get Customer when sale is been created by own customer
				customer = await this._customersService.findByOwnerUserIdAndUserId(
					storeUserId,
					createSaleDto.createdByUserId,
				);
			} else {
				// This is get customer or create when sale is created by manual by store
				if (createSaleDtoBuyerUserId) {
					customer = await this._customersService.findByOwnerUserIdAndUserId(
						storeUserId,
						createSaleDtoBuyerUserId,
					);
				} else {
					customer =
						await this._customersService.findByOwnerUserIdAndProperties({
							email: createSaleDto.buyer.email,
							name: createSaleDto.buyer.name,
							ownerUserId: storeUserId,
							birthDate: createSaleDto.buyer.birthDate,
						});
				}

				if (!customer) {
					const createCustomerDto: CreateCustomerDto = {
						about: null,
						addresses: createSaleDto.buyer.address
							? [
									this._parseCreateAddressDtoToAddress(
										createSaleDto.buyer.address,
									),
							  ]
							: [],
						birthDate: createSaleDto.buyer.birthDate,
						email: createSaleDto.buyer.email,
						gender: createSaleDto.buyer.gender,
						name: createSaleDto.buyer.name,
						phoneNumbers: [createSaleDto.buyer.phoneNumber],
						userId: buyerUserId,
						tagsIds: [],
						uniqName: createUsernameByName(createSaleDto.buyer.name),
					};

					const newCustomer: ICustomer = await this._customersService.create(
						null,
						createCustomerDto,
						storeUserId,
					);

					customer = newCustomer;
				}
			}

			if (!customer) {
				throw new BadRequestException('Customer data required!');
			}

			createSaleStoreDto.customerId = customer._id;
		}

		return this._parseCreateSaleStoresDtoToSaleStores(
			createSaleDto.stores,
			saleNumber,
		);
	}

	private _parseCreateSaleStoresDtoToSaleStores(
		saleStoreDto: SaleStoreDto[],
		saleNumber: number,
	): ISaleStore[] {
		return saleStoreDto.map(
			(saleStoreDto: SaleStoreDto): ISaleStore => ({
				customerId: saleStoreDto.customerId as any,
				number: saleNumber,
				storeId: saleStoreDto.storeId as any,
				products: saleStoreDto.products as any,
				totals: saleStoreDto.totals,
			}),
		);
	}

	private _parseCreateAddressDtoToAddress(
		createAddressDto: CreateAddressDto,
	): IAddress | null {
		return createAddressDto
			? {
					address1: createAddressDto.address1,
					address2: createAddressDto.address2,
					city: createAddressDto.city,
					country: createAddressDto.country,
					description: createAddressDto.description,
					district: createAddressDto.district,
					isValid: true,
					state: createAddressDto.state,
					types: createAddressDto.types,
					uid: createAddressDto.uid,
					zip: createAddressDto.zip,
			  }
			: null;
	}

	private async _subtractProductsQuantityBySaleStores(
		saleStores: ISaleStore[],
	): Promise<void> {
		const productItemsToSubtract: Map<
			string,
			{ productItemId: string; productId: string; quantity: number }
		> = new Map();

		// Group by productItemId instead of productId
		saleStores.forEach((saleStore: ISaleStore) => {
			saleStore.products.forEach((saleStoreProduct: ISaleStoreProduct) => {
				const productItemId = saleStoreProduct.productItemId.toString();
				const existing = productItemsToSubtract.get(productItemId);

				if (existing) {
					existing.quantity += saleStoreProduct.quantity;
				} else {
					productItemsToSubtract.set(productItemId, {
						productItemId,
						productId: saleStoreProduct.productId.toString(),
						quantity: saleStoreProduct.quantity,
					});
				}
			});
		});

		// Update stock for each product item
		for await (const {
			productItemId,
			productId,
			quantity,
		} of productItemsToSubtract.values()) {
			// Always update product item stock
			const productItem: IProductItem =
				await this._productItemsService.findByIdOrFail(productItemId);

			await this._productItemsService.updateOne(
				{ _id: new mongoose.Types.ObjectId(productItemId) },
				{
					$inc: {
						quantity: -quantity,
					},
				},
				{
					new: true,
				},
			);

			// If product item is default, also update product stock
			if (productItem.isDefault) {
				await this._productsService.updateOne(
					new mongoose.Types.ObjectId(productId),
					{
						$inc: {
							quantity: -quantity,
						},
					},
					{
						new: true,
					},
				);
			}
		}
	}

	private async _updateProductsQuantityByUpdateManualSale(
		saleStoresDto: SaleStoreDto[],
		saleStores: ISaleStore[],
	): Promise<void> {
		// Format all products on previous state of sale stores to productItemId and quantity
		const productsQuantityBySaleStores: IProductToSubtract[] = reduce(
			saleStores,
			(acc: IProductToSubtract[], saleStore: ISaleStore) => {
				forEach(
					saleStore.products,
					(saleStoreProduct: ISaleStoreProduct): void => {
						const productItemId: string = (
							saleStoreProduct.productItem?._id ??
							saleStoreProduct.productItemId
						).toString();

						const findProductToSubtract: IProductToSubtract | undefined = find(
							acc,
							{ productItemId },
						);

						if (findProductToSubtract) {
							findProductToSubtract.quantity += saleStoreProduct.quantity;
						} else {
							acc.push({
								productId: saleStoreProduct.productId.toString(),
								productItemId,
								quantity: saleStoreProduct.quantity,
							});
						}
					},
				);

				return acc;
			},
			[],
		);

		// Format all products on sale stores dto to productItemId and quantity
		const productsQuantityBySaleStoresDto: IProductToSubtract[] = reduce(
			saleStoresDto,
			(acc: IProductToSubtract[], saleStoreDto: SaleStoreDto) => {
				forEach(
					saleStoreDto.products,
					(saleStoreProductDto: SaleStoreProductDto): void => {
						const findProductToSubtract: IProductToSubtract | undefined = find(
							acc,
							{
								productItemId: saleStoreProductDto.productItemId,
							},
						);

						if (findProductToSubtract) {
							findProductToSubtract.quantity += saleStoreProductDto.quantity;
						} else {
							acc.push({
								productId: saleStoreProductDto.productId,
								productItemId: saleStoreProductDto.productItemId,
								quantity: saleStoreProductDto.quantity,
							});
						}
					},
				);

				return acc;
			},
			[],
		);

		// Make a logic to put a quantity by product item and to increment or decrement based on state of new quantity
		const productsToSubtract: IProductToSubtract[] = reduce(
			productsQuantityBySaleStoresDto,
			(
				acc: IProductToSubtract[],
				productQuantityBySaleStoreDto: IProductToSubtract,
			) => {
				const findProductQuantityBySaleStores: IProductToSubtract | undefined =
					find(productsQuantityBySaleStores, {
						productItemId: productQuantityBySaleStoreDto.productItemId,
					});

				if (findProductQuantityBySaleStores) {
					acc.push({
						productId: findProductQuantityBySaleStores.productId,
						productItemId: findProductQuantityBySaleStores.productItemId,
						quantity:
							productQuantityBySaleStoreDto.quantity -
							findProductQuantityBySaleStores.quantity,
					});
				} else {
					acc.push({
						productId: productQuantityBySaleStoreDto.productId,
						productItemId: productQuantityBySaleStoreDto.productItemId,
						quantity: productQuantityBySaleStoreDto.quantity,
					});
				}

				return acc;
			},
			[],
		);

		// Add new products to subtract when product item was removed from sale stores
		productsQuantityBySaleStores.forEach(
			(productQuantityBySaleStores: IProductToSubtract) => {
				const productToSubtract: IProductToSubtract | undefined = find(
					productsToSubtract,
					{ productItemId: productQuantityBySaleStores.productItemId },
				);

				if (!productToSubtract) {
					productsToSubtract.push({
						productId: productQuantityBySaleStores.productId,
						productItemId: productQuantityBySaleStores.productItemId,
						quantity: -productQuantityBySaleStores.quantity,
					});
				}
			},
		);

		// Increment or decrement quantity of product items (and product when default)
		for await (const {
			productId,
			productItemId,
			quantity,
		} of productsToSubtract) {
			const productItem: IProductItem =
				await this._productItemsService.findByIdOrFail(productItemId);

			await this._productItemsService.updateOne(
				{ _id: new mongoose.Types.ObjectId(productItemId) },
				{
					$inc: {
						quantity: -quantity,
					},
				},
				{
					new: true,
				},
			);

			if (productItem.isDefault) {
				await this._productsService.updateOne(
					new mongoose.Types.ObjectId(productId),
					{
						$inc: {
							quantity: -quantity,
						},
					},
					{
						new: true,
					},
				);
			}
		}
	}

	private _parseSalesToChartDataPeriodType(
		sales: ISale[],
		storeIds: string[],
		periodType: ChartsEnum.PeriodType,
		productIds: string[] = [],
		productItemIds: string[] = [],
	): IChartDataPeriodTypeItem[] {
		const chartDataItems: IChartDateTotalItem[] = reduce(
			sales,
			(acc: IChartDateTotalItem[], sale: ISale) => {
				const totalAndQuantity = sale.stores.reduce(
					(acc: IChartTotalAndQuantity, saleStore: ISaleStore) => {
						if (includes(storeIds, saleStore.storeId.toString())) {
							const saleStoreProductsTotalQuantity: IChartTotalAndQuantity =
								reduce(
									saleStore.products,
									(
										acc2: IChartTotalAndQuantity,
										saleStoreProduct: ISaleStoreProduct,
									) => {
										if (!saleStoreProduct.isValid) {
											return acc2;
										}

										if (
											productIds.length > 0 &&
											!includes(
												productIds,
												saleStoreProduct.productId.toString(),
											)
										) {
											return acc2;
										}

										if (
											productItemIds.length > 0 &&
											!includes(
												productItemIds,
												saleStoreProduct.productItemId.toString(),
											)
										) {
											return acc2;
										}

										acc2.quantity += saleStoreProduct.quantity;
										acc2.total +=
											saleStoreProduct.price * saleStoreProduct.quantity;

										return acc2;
									},
									{
										total: 0,
										quantity: 0,
									},
								);

							acc.total += saleStoreProductsTotalQuantity.total;
							acc.quantity += saleStoreProductsTotalQuantity.quantity;
						}

						return acc;
					},
					{
						total: 0,
						quantity: 0,
					},
				);

				acc.push({
					date: sale.createdDate,
					...totalAndQuantity,
				});

				return acc;
			},
			[],
		);

		return parseToChartDataPeriodTypeItem(chartDataItems, periodType, sales);
	}

	private async _parseSalesToChartDataProducts(
		sales: ISale[],
		storeIds: string[],
		productIds: string[] = [],
		productItemIds: string[] = [],
	): Promise<{
		chartDataProductsByTotal: IChartDataProductItem[];
		chartDataProductsByQuantity: IChartDataProductItem[];
	}> {
		const salesStoresProducts: ISaleStoreProduct[] = flatMap(
			sales,
			(sale: ISale) =>
				flatMap(sale.stores, (saleStore: ISaleStore) => {
					if (includes(storeIds, saleStore.storeId.toString())) {
						return filter(saleStore.products, { isValid: true });
					}

					return [];
				}),
		);

		const salesStoresProductsString: ISaleStoreProductString[] = map(
			salesStoresProducts,
			(saleStoreProduct: ISaleStoreProduct): ISaleStoreProductString => ({
				barcode: saleStoreProduct.barcode,
				note: saleStoreProduct.note,
				price: saleStoreProduct.price,
				quantity: saleStoreProduct.quantity,
				productId: saleStoreProduct.productId.toString(),
				productItemId: saleStoreProduct.productItemId.toString(),
			}),
		);

		const chartDataProductItems: IChartDataProductItem[] = reduce(
			salesStoresProductsString,
			(
				acc: IChartDataProductItem[],
				saleStoreProduct: ISaleStoreProductString,
			) => {
				if (
					productIds.length > 0 &&
					!includes(productIds, saleStoreProduct.productId)
				) {
					return acc;
				}

				if (
					productItemIds.length > 0 &&
					!includes(productItemIds, saleStoreProduct.productItemId)
				) {
					return acc;
				}

				const findChartDataProductItem: IChartDataProductItem | undefined =
					find(acc, {
						productId: saleStoreProduct.productId,
						productItemId: saleStoreProduct.productItemId,
					}) as IChartDataProductItem | undefined;

				if (findChartDataProductItem) {
					findChartDataProductItem.total +=
						saleStoreProduct.price * saleStoreProduct.quantity;
					findChartDataProductItem.quantity += saleStoreProduct.quantity;
				} else {
					acc.push({
						quantity: saleStoreProduct.quantity,
						name: saleStoreProduct.barcode,
						productId: saleStoreProduct.productId.toString(),
						total: saleStoreProduct.price * saleStoreProduct.quantity,
						mainUrl: '',
						productItemId: saleStoreProduct.productItemId.toString(),
					});
				}

				return acc;
			},
			[],
		);

		const chartDataProductsByTotal: IChartDataProductItem[] =
			await this._chartDataProductItemsByOrderProperty(
				chartDataProductItems,
				'total',
			);
		const chartDataProductsByQuantity: IChartDataProductItem[] =
			await this._chartDataProductItemsByOrderProperty(
				chartDataProductItems,
				'quantity',
			);

		return {
			chartDataProductsByTotal,
			chartDataProductsByQuantity,
		};
	}

	private async _chartDataProductItemsByOrderProperty(
		chartDataProductItems: IChartDataProductItem[],
		keyOrder: keyof IChartDataProductItem,
	): Promise<IChartDataProductItem[]> {
		let chartDataProductItemsByOrder: IChartDataProductItem[] = orderBy(
			chartDataProductItems,
			keyOrder,
			'desc',
		);

		chartDataProductItemsByOrder = reduce(
			chartDataProductItemsByOrder,
			(acc: IChartDataProductItem[], curr: IChartDataProductItem) => {
				if (acc.length < ChartsEnum.DefaultItemsLength) {
					acc.push(curr);
				} else if (acc.length === ChartsEnum.DefaultItemsLength) {
					acc.push({
						quantity: curr.quantity,
						name: ChartsEnum.OthersName,
						productId: curr.productId,
						total: curr.total,
						mainUrl: curr.mainUrl,
						productItemId: curr.productItemId,
					});
				} else {
					acc[ChartsEnum.DefaultItemsLength].total += curr.total;
					acc[ChartsEnum.DefaultItemsLength].quantity += curr.quantity;
				}

				return acc;
			},
			[],
		);

		const products: IProduct[] = await this._productsService.findByIds(
			map(chartDataProductItemsByOrder, 'productId'),
		);

		const productItems: IProductItem[] =
			await this._productItemsService.findByIds(
				map(chartDataProductItemsByOrder, 'productItemId'),
			);

		chartDataProductItemsByOrder = map(
			chartDataProductItemsByOrder,
			(item): IChartDataProductItem => {
				if (item.name === ChartsEnum.OthersName) {
					return item;
				}

				const product: IProduct | undefined = find(
					products,
					(x) => x._id.toString() === item.productId,
				);

				const productItem: IProductItem | undefined = find(
					productItems,
					(x) => x._id.toString() === item.productItemId,
				);

				item.name = productItem?.name || product?.name || item.name;
				item.mainUrl = productItem?.mainUrl || product?.mainUrl || item.mainUrl;

				return item;
			},
		);

		return chartDataProductItemsByOrder;
	}

	private async _parseSalesToSalesBalance({
		sales,
		storeId,
		productIds = [],
		productItemIds = [],
	}: {
		sales: ISale[];
		storeId?: string;
		productIds: string[];
		productItemIds: string[];
	}): Promise<IGetSalesBalanceResponse> {
		const salesBalanceResponse: IGetSalesBalanceResponse = {
			annual: {
				quantity: 0,
				total: 0,
				productsBalance: [],
				salesQuantity: 0,
			},
			day: {
				quantity: 0,
				total: 0,
				productsBalance: [],
				salesQuantity: 0,
			},
			hour: {
				quantity: 0,
				total: 0,
				productsBalance: [],
				salesQuantity: 0,
			},
			month: {
				quantity: 0,
				total: 0,
				productsBalance: [],
				salesQuantity: 0,
			},
		};

		const startHour = moment()
			.tz(DatesEnum.Timezones.America_Sao_Paulo)
			.startOf('hour');
		const endHour = moment()
			.tz(DatesEnum.Timezones.America_Sao_Paulo)
			.endOf('hour');

		const startDay = moment()
			.tz(DatesEnum.Timezones.America_Sao_Paulo)
			.startOf('day');
		const endDay = moment()
			.tz(DatesEnum.Timezones.America_Sao_Paulo)
			.endOf('day');

		const startMonth = moment()
			.tz(DatesEnum.Timezones.America_Sao_Paulo)
			.startOf('month');
		const endMonth = moment()
			.tz(DatesEnum.Timezones.America_Sao_Paulo)
			.endOf('month');

		const startYear = moment()
			.tz(DatesEnum.Timezones.America_Sao_Paulo)
			.startOf('year');
		const endYear = moment()
			.tz(DatesEnum.Timezones.America_Sao_Paulo)
			.endOf('year');

		for (const sale of sales) {
			const quantity: number = this._getQuantityBySale({
				sale,
				storeId,
				productIds,
				productItemIds,
			});

			const saleStoreProducts: ISaleStoreProduct[] = this._getSaleStoreProducts(
				{ sale, storeId, productIds, productItemIds },
			);

			const sumSaleStoreProductsTotal: number =
				this._sumSaleStoreProductsTotal(saleStoreProducts);

			const saleCreatedAt = moment(sale.createdDate).tz(
				DatesEnum.Timezones.America_Sao_Paulo,
			);

			if (
				saleCreatedAt.isSameOrAfter(startHour) &&
				saleCreatedAt.isSameOrBefore(endHour)
			) {
				salesBalanceResponse.hour.productsBalance =
					this._mergeSaleStoreProductsWithSalesBalance(
						salesBalanceResponse.hour.productsBalance,
						saleStoreProducts,
					);
				salesBalanceResponse.hour.quantity += quantity;
				salesBalanceResponse.hour.total += sumSaleStoreProductsTotal;
				salesBalanceResponse.hour.salesQuantity += 1;
			}

			if (
				saleCreatedAt.isSameOrAfter(startDay) &&
				saleCreatedAt.isSameOrBefore(endDay)
			) {
				salesBalanceResponse.day.productsBalance =
					this._mergeSaleStoreProductsWithSalesBalance(
						salesBalanceResponse.day.productsBalance,
						saleStoreProducts,
					);
				salesBalanceResponse.day.quantity += quantity;
				salesBalanceResponse.day.total += sumSaleStoreProductsTotal;
				salesBalanceResponse.day.salesQuantity += 1;
			}

			if (
				saleCreatedAt.isSameOrAfter(startMonth) &&
				saleCreatedAt.isSameOrBefore(endMonth)
			) {
				salesBalanceResponse.month.productsBalance =
					this._mergeSaleStoreProductsWithSalesBalance(
						salesBalanceResponse.month.productsBalance,
						saleStoreProducts,
					);
				salesBalanceResponse.month.quantity += quantity;
				salesBalanceResponse.month.total += sumSaleStoreProductsTotal;
				salesBalanceResponse.month.salesQuantity += 1;
			}

			if (
				saleCreatedAt.isSameOrAfter(startYear) &&
				saleCreatedAt.isSameOrBefore(endYear)
			) {
				salesBalanceResponse.annual.productsBalance =
					this._mergeSaleStoreProductsWithSalesBalance(
						salesBalanceResponse.annual.productsBalance,
						saleStoreProducts,
					);
				salesBalanceResponse.annual.quantity += quantity;
				salesBalanceResponse.annual.total += sumSaleStoreProductsTotal;
				salesBalanceResponse.annual.salesQuantity += 1;
			}
		}

		const productIdsByUniq: string[] = uniq([
			...map(salesBalanceResponse.hour.productsBalance, 'productId'),
			...map(salesBalanceResponse.day.productsBalance, 'productId'),
			...map(salesBalanceResponse.month.productsBalance, 'productId'),
			...map(salesBalanceResponse.annual.productsBalance, 'productId'),
		]);

		const productItemIdsByUniq: string[] = uniq([
			...map(salesBalanceResponse.hour.productsBalance, 'productItemId'),
			...map(salesBalanceResponse.day.productsBalance, 'productItemId'),
			...map(salesBalanceResponse.month.productsBalance, 'productItemId'),
			...map(salesBalanceResponse.annual.productsBalance, 'productItemId'),
		]);

		const products: IProduct[] =
			await this._productsService.findByIds(productIdsByUniq);

		const productItems: IProductItem[] =
			await this._productItemsService.findByIds(productItemIdsByUniq);

		salesBalanceResponse.hour.productsBalance = map(
			orderBy(
				salesBalanceResponse.hour.productsBalance,
				['total', 'quantity'],
				['desc'],
			),
			(productBalance: IGetSalesProductBalanceResponse) => ({
				...productBalance,
				product: find(
					products,
					(product: IProduct) =>
						product._id.toString() === productBalance.productId,
				),
				productItem: find(
					productItems,
					(productItem: IProductItem) =>
						productItem._id.toString() === productBalance.productItemId,
				),
			}),
		);

		salesBalanceResponse.day.productsBalance = map(
			orderBy(
				salesBalanceResponse.day.productsBalance,
				['total', 'quantity'],
				['desc'],
			),
			(productBalance: IGetSalesProductBalanceResponse) => ({
				...productBalance,
				product: find(
					products,
					(product: IProduct) =>
						product._id.toString() === productBalance.productId,
				),
				productItem: find(
					productItems,
					(productItem: IProductItem) =>
						productItem._id.toString() === productBalance.productItemId,
				),
			}),
		);

		salesBalanceResponse.month.productsBalance = map(
			orderBy(
				salesBalanceResponse.month.productsBalance,
				['total', 'quantity'],
				['desc'],
			),
			(productBalance: IGetSalesProductBalanceResponse) => ({
				...productBalance,
				product: find(
					products,
					(product: IProduct) =>
						product._id.toString() === productBalance.productId,
				),
				productItem: find(
					productItems,
					(productItem: IProductItem) =>
						productItem._id.toString() === productBalance.productItemId,
				),
			}),
		);

		salesBalanceResponse.annual.productsBalance = map(
			orderBy(
				salesBalanceResponse.annual.productsBalance,
				['total', 'quantity'],
				['desc'],
			),
			(productBalance: IGetSalesProductBalanceResponse) => ({
				...productBalance,
				product: find(
					products,
					(product: IProduct) =>
						product._id.toString() === productBalance.productId,
				),
				productItem: find(
					productItems,
					(productItem: IProductItem) =>
						productItem._id.toString() === productBalance.productItemId,
				),
			}),
		);

		return salesBalanceResponse;
	}

	private _getQuantityBySale = ({
		sale,
		storeId,
		productIds = [],
		productItemIds = [],
	}: {
		sale: ISale;
		storeId?: string;
		productIds: string[];
		productItemIds: string[];
	}): number => {
		return reduce(
			sale.stores,
			(accStore: number, store: ISaleStore) => {
				if (storeId && store.storeId.toString() !== storeId) {
					return accStore;
				}

				accStore += reduce(
					store.products,
					(accProduct: number, saleStoreProduct: ISaleStoreProduct) => {
						if (!saleStoreProduct.isValid) {
							return accProduct;
						}

						if (
							productIds.length > 0 &&
							!includes(productIds, saleStoreProduct.productId.toString())
						) {
							return accProduct;
						}

						if (
							productItemIds.length > 0 &&
							!includes(
								productItemIds,
								saleStoreProduct.productItemId.toString(),
							)
						) {
							return accProduct;
						}

						accProduct += saleStoreProduct.quantity;
						return accProduct;
					},
					0,
				);

				return accStore;
			},
			0,
		);
	};

	private _getSaleStoreProducts = ({
		sale,
		storeId,
		productIds,
		productItemIds,
	}: {
		sale: ISale;
		storeId?: string;
		productIds: string[];
		productItemIds: string[];
	}): ISaleStoreProduct[] => {
		return reduce(
			sale.stores,
			(accStore: ISaleStoreProduct[], store: ISaleStore) => {
				if (storeId && store.storeId.toString() !== storeId) {
					return accStore;
				}

				let saleStoreProducts: ISaleStoreProduct[] = store.products;

				if (productIds.length > 0) {
					saleStoreProducts = filter(
						store.products,
						(storeProduct: ISaleStoreProduct) =>
							storeProduct.isValid &&
							includes(productIds, storeProduct.productId.toString()),
					);
				}

				if (productItemIds.length > 0) {
					saleStoreProducts = filter(
						store.products,
						(storeProduct: ISaleStoreProduct) =>
							storeProduct.isValid &&
							includes(productItemIds, storeProduct.productItemId.toString()),
					);
				}

				accStore.push(...saleStoreProducts);
				return accStore;
			},
			[],
		);
	};

	private _mergeSaleStoreProductsWithSalesBalance = (
		productsBalance: IGetSalesProductBalanceResponse[],
		saleStoreProducts: ISaleStoreProduct[],
	): IGetSalesProductBalanceResponse[] => {
		for (const saleStoreProduct of saleStoreProducts) {
			const findProductBalance: IGetSalesProductBalanceResponse | undefined =
				productsBalance.find(
					(productBalance: IGetSalesProductBalanceResponse) =>
						productBalance.productId ===
							saleStoreProduct.productId.toString() &&
						productBalance.productItemId ===
							saleStoreProduct.productItemId.toString(),
				);
			if (findProductBalance) {
				findProductBalance.quantity += saleStoreProduct.quantity;
				findProductBalance.total +=
					saleStoreProduct.quantity * saleStoreProduct.price;
			} else {
				productsBalance.push({
					productId: saleStoreProduct.productId.toString(),
					quantity: saleStoreProduct.quantity,
					total: saleStoreProduct.quantity * saleStoreProduct.price,
					productItemId: saleStoreProduct.productItemId.toString(),
				});
			}
		}

		return productsBalance;
	};

	private _sumSaleStoreProductsTotal = (
		saleStoreProducts: ISaleStoreProduct[],
	): number => {
		return reduce(
			saleStoreProducts,
			(acc, saleStoreProduct) => {
				acc += saleStoreProduct.quantity * saleStoreProduct.price;
				return acc;
			},
			0,
		);
	};

	private async _completeSaleStoresProducts(saleId: string): Promise<ISale> {
		const sale: ISale = await this.findByIdOrFail(saleId);

		sale.stores = map(sale.stores, (saleStore: ISaleStore) => {
			return {
				...saleStore,
				products: map(
					saleStore.products,
					(saleStoreProduct: ISaleStoreProduct) => {
						return {
							...saleStoreProduct,
							isCompleted: saleStoreProduct.isValid
								? true
								: saleStoreProduct.isCompleted,
						};
					},
				),
			};
		});

		const updatedSale: ISale = await this._saleModel.findOneAndUpdate(
			{
				_id: new mongoose.Types.ObjectId(saleId),
			},
			{
				$set: {
					stores: sale.stores,
				},
			},
			{ new: true },
		);

		return updatedSale;
	}

	// #endregion

	// #region Upload

	public async uploadSales(
		files: Express.Multer.File[],
		userId: string,
		employeeId: string,
	): Promise<void> {
		const hasUploadProcessing: boolean =
			await this._filesUploadsService.hasUploadSalesProcessingByUserId(userId);

		if (hasUploadProcessing) {
			throw new InternalServerErrorException(
				'In the moment you have upload sales files processing. please wait finish to try upload new files.',
			);
		}

		const tags: ITag[] = await this._tagsService.findByType(
			userId,
			TagsEnum.Type.SALE,
		);

		const stores: IStore[] = await this._storesService.findByUserId(userId);

		const now: Date = new Date();

		this._filesService
			.getUploadFilesUrl(files)
			.then(async (filenames: string[]) => {
				const filesUploads: IFileUpload[] =
					await this._filesUploadsService.createMulti({
						employeeId,
						filenames,
						type: FilesUploadsEnum.Type.UPLOAD_SALES,
						userId,
					});

				const fileUploadTemplateErrors: IFileUploadTemplateError<ISaleFileUploadTemplateRow>[] =
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

					const fileUploadTemplateError: IFileUploadTemplateError<ISaleFileUploadTemplateRow> =
						{
							filename,
							fileNumber: index + 1,
							rowsError: [],
							processError: undefined,
							fileColumns: {
								rowNumber: 'Row Number',
								uniqName: 'Uniq Name',
								name: 'Name',
								email: 'Email',
								birthDate: 'Birth Date',
								gender: 'Gender',
								about: 'About',
								country: 'Country',
								state: 'State',
								city: 'City',
								zipCode: 'Zip Code',
								address1: 'Address1',
								address2: 'Address2',
								district: 'District',
								addressDescription: 'Address Description',
								addressTypes: 'Address Types',
								phoneType: 'Phone Type',
								phoneNumber: 'Phone Number',
								phoneMessengers: 'Phone Messengers',
								selectedProducts: 'Selected Products',
								discount: 'Discount',
								shipping: 'Shipping',
								tax: 'Tax',
								payments: 'Payments',
								note: 'Note',
								tags: 'Tags',
								saleStatus: 'Sale Status',
								paymentStatus: 'Payment Status',
								deliveryDate: 'Delivery Date',
								deliveryType: 'Delivery Type',
								createdDate: 'Created Date',
								saleNumberManual: 'Sale Number Manual',
								noteToCustomer: 'Note to Customer',
								sendCustomerNotifications: 'Send Customer Notifications',
								completedAt: 'Completed At',
								other: 'Other',
							},
						};

					try {
						const saleFileUploadTemplateRows: ISaleFileUploadTemplateRow[] =
							await this._getSaleFileUploadTemplateRowsByFilename(filename);

						await this._filesUploadsService.findByIdAndUpdate(fileUploadId, {
							$set: {
								updatedAt: new Date(),
								totalToProcess: saleFileUploadTemplateRows.length,
							},
						});

						const { totalError, totalProcessed, totalSuccess, rowsError } =
							await this._processSaleFileUploadTemplateRows({
								saleFileUploadTemplateRows,
								ownerUserId: userId,
								employeeId,
								tags,
								now,
								storesFromUser: stores,
								filename,
							});

						fileUploadTemplateError.rowsError = rowsError;

						await this._filesUploadsService.findByIdAndUpdate(fileUploadId, {
							$set: {
								updatedAt: new Date(),
								totalError,
								totalSuccess,
								totalProcessed,
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

					this._socketsGateway.handleResponseUploadSalesFileToUser(userId);
				}

				this._socketsGateway.handleUploadSalesResponseToEmployee(
					fileUploadTemplateErrors,
					employeeId,
				);
			})
			.catch((error: any) => {
				this._logger.error(error);
				throw new Error('Error when attempt process sales upload.');
			});
	}

	private async _getSaleFileUploadTemplateRowsByFilename(
		filename: string,
	): Promise<ISaleFileUploadTemplateRow[]> {
		const fileBuffer: Buffer | null =
			await this._filesService.getFileBufferByFilename(filename);

		if (!fileBuffer) {
			throw new Error(`File Error, no data in file: ${filename}`);
		}

		const workbook: ExcelJS.Workbook = new ExcelJS.Workbook();
		await workbook.xlsx.load(fileBuffer);

		const worksheet: ExcelJS.Worksheet = workbook.getWorksheet('Template');

		this._salesValidationService.validateSalesUploadTemplate(
			worksheet.getRow(1),
		);

		const worksheetRowsCountToIterate: number = worksheet.rowCount + 1;

		const saleFileUploadTemplateRows: ISaleFileUploadTemplateRow[] = [];

		for (
			let rowNumber = 2;
			rowNumber < worksheetRowsCountToIterate;
			rowNumber++
		) {
			if (worksheetRowsCountToIterate === rowNumber) {
				break;
			}

			const row: ExcelJS.Row = worksheet.getRow(rowNumber);

			const uniqName: string = row.getCell('A')?.text?.trim();
			const name: string = row.getCell('B')?.text?.trim();
			const email: string = row.getCell('C')?.text?.trim();
			const birthDate: string = row.getCell('D')?.text?.trim();
			const gender: string = row.getCell('E')?.text?.trim();
			const about: string = row.getCell('F')?.text?.trim();
			const country: string = row.getCell('G')?.text?.trim();
			const state: string = row.getCell('H')?.text?.trim();
			const city: string = row.getCell('I')?.text?.trim();
			const zipCode: string = row.getCell('J')?.text?.trim();
			const address1: string = row.getCell('K')?.text?.trim();
			const address2: string = row.getCell('L')?.text?.trim();
			const district: string = row.getCell('M')?.text?.trim();
			const addressDescription: string = row.getCell('N')?.text?.trim();
			const addressTypes: string = row.getCell('O')?.text?.trim();
			const phoneType: string = row.getCell('P')?.text?.trim();
			const phoneNumber: string = row.getCell('Q')?.text?.trim();
			const phoneMessengers: string = row.getCell('R')?.text?.trim();
			const selectedProducts: string = row.getCell('S')?.text?.trim();
			const discount: string = row.getCell('T')?.text?.trim();
			const shipping: string = row.getCell('U')?.text?.trim();
			const tax: string = row.getCell('V')?.text?.trim();
			const payments: string = row.getCell('W')?.text?.trim();
			const note: string = row.getCell('X')?.text?.trim();
			const tags: string = row.getCell('Y')?.text?.trim();
			const saleStatus: string = row.getCell('Z')?.text?.trim();
			const paymentStatus: string = row.getCell('AA')?.text?.trim();
			const deliveryDate: string = row.getCell('AB')?.text?.trim();
			const deliveryType: string = row.getCell('AC')?.text?.trim();
			const createdDate: string = row.getCell('AD')?.text?.trim();
			const saleNumberManual: string = row.getCell('AE')?.text?.trim();
			const noteToCustomer: string = row.getCell('AF')?.text?.trim();
			const sendCustomerNotifications: string = row.getCell('AG')?.text?.trim();
			const completedAt: string = row.getCell('AH')?.text?.trim();

			saleFileUploadTemplateRows.push({
				rowNumber,
				name,
				about,
				address1,
				address2,
				addressDescription,
				addressTypes,
				birthDate,
				city,
				country,
				district,
				email,
				gender,
				phoneMessengers,
				phoneNumber,
				phoneType,
				state,
				tags,
				zipCode,
				selectedProducts,
				discount,
				shipping,
				tax,
				payments,
				note,
				saleStatus,
				paymentStatus,
				deliveryDate,
				uniqName,
				deliveryType,
				createdDate,
				saleNumberManual,
				noteToCustomer,
				sendCustomerNotifications,
				completedAt,
			});
		}

		return saleFileUploadTemplateRows;
	}

	private async _processSaleFileUploadTemplateRows({
		employeeId,
		filename,
		now,
		ownerUserId,
		saleFileUploadTemplateRows,
		storesFromUser,
		tags,
	}: {
		saleFileUploadTemplateRows: ISaleFileUploadTemplateRow[];
		ownerUserId: string;
		employeeId: string;
		tags: ITag[];
		now: Date;
		storesFromUser: IStore[];
		filename: string;
	}): Promise<ITotalsProcessedFileUploadTemplateRows> {
		const fileUploadTemplateErrorRows: IFileUploadTemplateErrorRow<ISaleFileUploadTemplateRow>[] =
			[];

		const salesToCreateByUpload: ISaleToCreateByUpload[] = [];

		/**
		 * Validate rows and create sales date to create by upload
		 */
		for await (const saleFileUploadTemplateRow of saleFileUploadTemplateRows) {
			const fileUploadTemplateErrorRow: IFileUploadTemplateErrorRow<ISaleFileUploadTemplateRow> =
				{
					rowNumber: saleFileUploadTemplateRow.rowNumber,
					reasons: [],
				};

			let customer: ICustomer | undefined;

			try {
				const rowUniqName: string = saleFileUploadTemplateRow.uniqName?.trim();
				if (rowUniqName) {
					customer = await this._customersService.findByOwnerUserIdAndUniqName(
						ownerUserId,
						rowUniqName,
					);
				}

				/**
				 * It should try to find the customer if it is not found in the uniqName, if it is not found in the properties, it should create the customer
				 * and only create the customer if it passes the sale validation
				 */
				const birthDate: Date | null = saleFileUploadTemplateRow.birthDate
					? parseToDate(saleFileUploadTemplateRow.birthDate)
					: null;

				if (!customer) {
					if (!saleFileUploadTemplateRow.name?.trim()) {
						fileUploadTemplateErrorRow.reasons.push({
							message:
								'"Name" is required if "Uniq Name" was not passed or if customer was not find by "Uniq Name"!',
							property: 'name',
						});

						fileUploadTemplateErrorRow.reasons.push({
							message: 'Customer not found by "Uniq Name"',
							property: 'uniqName',
						});
					}

					if (
						saleFileUploadTemplateRow.email &&
						!isValidEmail(saleFileUploadTemplateRow.email)
					) {
						fileUploadTemplateErrorRow.reasons.push({
							message: 'Email invalid format!',
							property: 'email',
						});
					}

					if (saleFileUploadTemplateRow.birthDate?.trim() && !birthDate) {
						fileUploadTemplateErrorRow.reasons.push({
							message: 'Birth Date invalid format!',
							property: 'birthDate',
						});
					}

					if (
						saleFileUploadTemplateRow.gender &&
						!includes(
							Object.keys(PersonEnum.Gender),
							saleFileUploadTemplateRow.gender.toUpperCase(),
						)
					) {
						fileUploadTemplateErrorRow.reasons.push({
							message: 'Gender invalid!',
							property: 'gender',
						});
					}

					if (
						saleFileUploadTemplateRow.address1 ||
						saleFileUploadTemplateRow.country ||
						saleFileUploadTemplateRow.state ||
						saleFileUploadTemplateRow.city ||
						saleFileUploadTemplateRow.zipCode ||
						saleFileUploadTemplateRow.district
					) {
						if (!saleFileUploadTemplateRow.address1?.trim()) {
							fileUploadTemplateErrorRow.reasons.push({
								message: 'Address1 invalid!',
								property: 'address1',
							});
						}

						if (!saleFileUploadTemplateRow.country?.trim()) {
							fileUploadTemplateErrorRow.reasons.push({
								message: 'Country invalid!',
								property: 'country',
							});
						}

						if (!saleFileUploadTemplateRow.state?.trim()) {
							fileUploadTemplateErrorRow.reasons.push({
								message: 'State invalid!',
								property: 'state',
							});
						}

						if (!saleFileUploadTemplateRow.city?.trim()) {
							fileUploadTemplateErrorRow.reasons.push({
								message: 'City invalid!',
								property: 'city',
							});
						}

						if (!saleFileUploadTemplateRow.zipCode) {
							fileUploadTemplateErrorRow.reasons.push({
								message: 'Zip Code invalid!',
								property: 'zipCode',
							});
						}

						if (!saleFileUploadTemplateRow.district?.trim()) {
							fileUploadTemplateErrorRow.reasons.push({
								message: 'District invalid!',
								property: 'district',
							});
						}
					}

					customer =
						saleFileUploadTemplateRow.name &&
						saleFileUploadTemplateRow.email &&
						birthDate
							? await this._customersService.findByMainPropertiesAndOwnerUserId(
									saleFileUploadTemplateRow.name,
									saleFileUploadTemplateRow.email,
									birthDate,
									ownerUserId,
							  )
							: null;
				}

				let selectedProducts: ISaleFileUploadTemplateSelectedProductFormat[] =
					[];
				if (!saleFileUploadTemplateRow.selectedProducts?.trim()) {
					fileUploadTemplateErrorRow.reasons.push({
						message: 'Selected Products is required!',
						property: 'selectedProducts',
					});
				} else {
					try {
						selectedProducts = parseAnyStringToObject(
							saleFileUploadTemplateRow.selectedProducts?.trim(),
						);

						if (selectedProducts.length === 0) {
							fileUploadTemplateErrorRow.reasons.push({
								message: 'Selected Products empty list!',
								property: 'selectedProducts',
							});
						}

						selectedProducts =
							this._getRowSelectedProductsValidated(selectedProducts);
					} catch (error) {
						fileUploadTemplateErrorRow.reasons.push({
							message: 'Selected Products invalid format!',
							property: 'selectedProducts',
						});
					}
				}

				if (
					saleFileUploadTemplateRow.discount &&
					isNaN(parseFloat(saleFileUploadTemplateRow.discount.toString()))
				) {
					fileUploadTemplateErrorRow.reasons.push({
						message: 'Discount invalid format!',
						property: 'discount',
					});
				}

				if (
					saleFileUploadTemplateRow.shipping &&
					isNaN(parseFloat(saleFileUploadTemplateRow.shipping.toString()))
				) {
					fileUploadTemplateErrorRow.reasons.push({
						message: 'Shipping invalid format!',
						property: 'shipping',
					});
				}

				if (
					saleFileUploadTemplateRow.tax &&
					isNaN(parseFloat(saleFileUploadTemplateRow.tax.toString()))
				) {
					fileUploadTemplateErrorRow.reasons.push({
						message: 'Tax invalid format!',
						property: 'tax',
					});
				}

				let payments: ISaleFileUploadTemplateRowPaymentFormat[] = [];
				if (saleFileUploadTemplateRow.payments?.trim()) {
					try {
						payments = parseAnyStringToObject(
							saleFileUploadTemplateRow.payments?.trim(),
						);

						if (payments.length === 0) {
							fileUploadTemplateErrorRow.reasons.push({
								message: 'Payments empty list!',
								property: 'payments',
							});
						}

						payments = this._getRowPaymentsValidated(payments);
					} catch (error) {
						fileUploadTemplateErrorRow.reasons.push({
							message: 'Payments invalid format!',
							property: 'payments',
						});
					}
				}

				if (
					saleFileUploadTemplateRow.saleStatus &&
					!includes(
						Object.keys(SalesEnum.Status),
						saleFileUploadTemplateRow.saleStatus.toUpperCase(),
					)
				) {
					fileUploadTemplateErrorRow.reasons.push({
						message: 'Sale Status invalid!',
						property: 'saleStatus',
					});
				}

				if (
					saleFileUploadTemplateRow.paymentStatus &&
					!includes(
						Object.keys(SalesEnum.PaymentStatus),
						saleFileUploadTemplateRow.paymentStatus.toUpperCase(),
					)
				) {
					fileUploadTemplateErrorRow.reasons.push({
						message: 'Payment Status invalid!',
						property: 'paymentStatus',
					});
				}

				const deliveryDate: Date | null = saleFileUploadTemplateRow.deliveryDate
					? parseToDate(saleFileUploadTemplateRow.deliveryDate)
					: null;

				if (saleFileUploadTemplateRow.deliveryDate && !deliveryDate) {
					fileUploadTemplateErrorRow.reasons.push({
						message: 'Delivery Date invalid format!',
						property: 'deliveryDate',
					});
				}

				if (
					saleFileUploadTemplateRow.deliveryType &&
					!includes(
						Object.keys(SalesEnum.DeliveryType),
						saleFileUploadTemplateRow.deliveryType.toUpperCase(),
					)
				) {
					fileUploadTemplateErrorRow.reasons.push({
						message: 'Delivery Type invalid!',
						property: 'deliveryType',
					});
				}

				const createdDate: Date | null = saleFileUploadTemplateRow.createdDate
					? parseToDate(saleFileUploadTemplateRow.createdDate)
					: null;

				if (saleFileUploadTemplateRow.createdDate && !createdDate) {
					fileUploadTemplateErrorRow.reasons.push({
						message: 'Created Date invalid format!',
						property: 'createdDate',
					});
				}

				const completedAt: Date | null = saleFileUploadTemplateRow.completedAt
					? parseToDate(saleFileUploadTemplateRow.completedAt)
					: null;

				if (saleFileUploadTemplateRow.completedAt && !completedAt) {
					fileUploadTemplateErrorRow.reasons.push({
						message: 'Completed At invalid format!',
						property: 'completedAt',
					});
				}

				if (fileUploadTemplateErrorRow.reasons.length > 0) {
					fileUploadTemplateErrorRows.push(fileUploadTemplateErrorRow);
					continue;
				}

				const { phoneNumber, phoneNumbers } =
					this._getPhoneNumbersByCustomerFileUploadTemplateRow(
						saleFileUploadTemplateRow,
						customer?.phoneNumbers,
					);

				const { address, addresses } =
					this._getAddressesByCustomerFileUploadTemplateRow(
						saleFileUploadTemplateRow,
						customer?.addresses,
					);

				if (customer) {
					customer.addresses = addresses;
					customer.phoneNumbers = phoneNumbers;
				} else {
					customer = {
						uploadFilename: filename,
						avatar: null,
						name: saleFileUploadTemplateRow.name,
						email: saleFileUploadTemplateRow.email,
						birthDate: birthDate,
						addresses,
						gender: saleFileUploadTemplateRow.gender
							? (saleFileUploadTemplateRow.gender.toUpperCase() as PersonEnum.Gender)
							: PersonEnum.Gender.OTHER,
						about: saleFileUploadTemplateRow.about,
						phoneNumbers,
						tagsIds: [],
						ownerUserId: ownerUserId as any,
						createdAt: now,
						updatedAt: now,
						userId: null,
						_id: null,
						uniqName:
							rowUniqName ??
							createUsernameByName(saleFileUploadTemplateRow.name),
					};
				}

				const tagsBySaleUploadTemplateRow: ITag[] =
					this._getTagsBySaleFileUploadTemplateRow(
						saleFileUploadTemplateRow.tags,
						ownerUserId,
						tags,
					);

				const saleAddress: IAddress = address ?? addresses[0];

				const salePhoneNumber: IPhoneNumber = phoneNumber ?? phoneNumbers[0];

				const discountAmount: number = isNaN(
					+saleFileUploadTemplateRow.discount,
				)
					? 0
					: parseFloat(saleFileUploadTemplateRow.discount.toString()) ?? 0;

				const shippingAmount: number = isNaN(
					+saleFileUploadTemplateRow.shipping,
				)
					? 0
					: parseFloat(saleFileUploadTemplateRow.shipping.toString()) ?? 0;

				const taxAmount: number = isNaN(+saleFileUploadTemplateRow.tax)
					? 0
					: parseFloat(saleFileUploadTemplateRow.tax.toString()) ?? 0;

				const saleStores: ISaleStore[] =
					await this._parseSelectedProductsToSaleStores({
						ownerUserId,
						selectedProducts,
						storesFromUser,
						customer,
						discountAmount,
						shippingAmount,
						taxAmount,
					});

				const { subtotalAmount, totalFinalAmount } = reduce(
					saleStores,
					(acc: ISubtotalAndTotalFinalAmount, store: ISaleStore) => {
						acc.subtotalAmount += store.totals.subtotalAmount;
						acc.totalFinalAmount += store.totals.totalFinalAmount;

						return acc;
					},
					{
						subtotalAmount: 0,
						totalFinalAmount: 0,
					},
				);

				const isSendCustomerNotifications: boolean =
					saleFileUploadTemplateRow.sendCustomerNotifications?.toUpperCase() ===
					CommonEnum.YesNo.YES;

				let saleBySaleNumberManual: ISale | null = null;

				const saleNumberManual: string | null =
					saleFileUploadTemplateRow.saleNumberManual?.trim() ?? null;

				if (saleNumberManual) {
					saleBySaleNumberManual =
						await this.findByNumberManual(saleNumberManual);
				}

				let sale: ISale | null = null;

				if (saleBySaleNumberManual) {
					sale = {
						completedAt: completedAt ?? saleBySaleNumberManual.completedAt,
						isSendCustomerNotifications: isSendCustomerNotifications,
						previousCustomerIds: saleBySaleNumberManual.previousCustomerIds,
						filesUrl: saleBySaleNumberManual.filesUrl,
						numberManual: saleBySaleNumberManual.numberManual,
						_id: saleBySaleNumberManual._id,
						uploadFilename: saleBySaleNumberManual.uploadFilename,
						buyer: {
							address: saleAddress,
							birthDate,
							email: saleFileUploadTemplateRow.email,
							gender: saleFileUploadTemplateRow.gender
								? (saleFileUploadTemplateRow.gender.toUpperCase() as PersonEnum.Gender)
								: PersonEnum.Gender.OTHER,
							name: saleFileUploadTemplateRow.name,
							phoneNumber: salePhoneNumber,
							userId: customer.userId ?? null,
						},
						createdDate: createdDate ?? saleBySaleNumberManual.createdDate,
						createdAt: saleBySaleNumberManual.createdAt,
						createdByEmployeeId: saleBySaleNumberManual.createdByEmployeeId,
						createdByUserId: saleBySaleNumberManual.createdByUserId,
						deliveryAt: deliveryDate,
						type: SalesEnum.Type.MANUAL,
						header: {
							billing: saleAddress
								? {
										address: saleAddress,
								  }
								: null,
							shipping: saleAddress
								? {
										address: saleAddress,
								  }
								: null,
							deliveryType: saleFileUploadTemplateRow.deliveryType
								? (saleFileUploadTemplateRow.deliveryType.toUpperCase() as SalesEnum.DeliveryType)
								: saleBySaleNumberManual.header.deliveryType,
						},
						note: saleFileUploadTemplateRow.note,
						payments: map(
							payments,
							(
								payment: ISaleFileUploadTemplateRowPaymentFormat,
							): ISalePayment => ({
								amount: payment.amount,
								type: payment.type,
								provider: null,
								status: SalesEnum.PaymentStatus.PENDING,
								note: null,
							}),
						),
						status: saleFileUploadTemplateRow.saleStatus
							? (saleFileUploadTemplateRow.saleStatus.toUpperCase() as SalesEnum.Status)
							: saleBySaleNumberManual.status,
						stores: saleStores,
						totals: {
							discount: discountAmount
								? {
										distributed: { amount: discountAmount, note: null },
								  }
								: null,
							shipping: { amount: shippingAmount, note: null },
							tax: { amount: taxAmount, note: null },
							subtotalAmount,
							totalFinalAmount,
						},
						paymentStatus: saleFileUploadTemplateRow.paymentStatus
							? (saleFileUploadTemplateRow.paymentStatus.toUpperCase() as SalesEnum.PaymentStatus)
							: saleBySaleNumberManual.paymentStatus,
						tagsIds: [],
						updatedByEmployeeId: null,
						number: saleBySaleNumberManual.number,
						softDelete: saleBySaleNumberManual.softDelete,
						updatedAt: now,
						updatedByUserId: ownerUserId as any,
						noteToCustomer:
							saleFileUploadTemplateRow.noteToCustomer ||
							saleBySaleNumberManual.noteToCustomer,
					};
				} else {
					sale = {
						completedAt:
							completedAt ??
							saleFileUploadTemplateRow.saleStatus?.toUpperCase() ===
								SalesEnum.Status.COMPLETED
								? deliveryDate ?? createdDate ?? now
								: null,
						isSendCustomerNotifications,
						previousCustomerIds: [],
						filesUrl: [],
						numberManual:
							saleFileUploadTemplateRow.saleNumberManual?.trim() ?? null,
						_id: null,
						uploadFilename: filename,
						buyer: {
							address: saleAddress,
							birthDate,
							email: saleFileUploadTemplateRow.email,
							gender: saleFileUploadTemplateRow.gender
								? (saleFileUploadTemplateRow.gender.toUpperCase() as PersonEnum.Gender)
								: PersonEnum.Gender.OTHER,
							name: saleFileUploadTemplateRow.name,
							phoneNumber: salePhoneNumber,
							userId: customer.userId ?? null,
						},
						createdDate: createdDate ?? now,
						createdAt: now,
						createdByEmployeeId: employeeId as any,
						createdByUserId: ownerUserId as any,
						deliveryAt: deliveryDate,
						type: SalesEnum.Type.MANUAL,
						header: {
							billing: saleAddress
								? {
										address: saleAddress,
								  }
								: null,
							shipping: saleAddress
								? {
										address: saleAddress,
								  }
								: null,
							deliveryType: saleFileUploadTemplateRow.deliveryType
								? (saleFileUploadTemplateRow.deliveryType.toUpperCase() as SalesEnum.DeliveryType)
								: SalesEnum.DeliveryType.DELIVERY,
						},
						note: saleFileUploadTemplateRow.note,
						payments: map(
							payments,
							(
								payment: ISaleFileUploadTemplateRowPaymentFormat,
							): ISalePayment => ({
								amount: payment.amount,
								type: payment.type,
								provider: null,
								status: SalesEnum.PaymentStatus.PENDING,
								note: null,
							}),
						),
						status: saleFileUploadTemplateRow.saleStatus
							? (saleFileUploadTemplateRow.saleStatus.toUpperCase() as SalesEnum.Status)
							: SalesEnum.Status.PENDING,
						stores: saleStores,
						totals: {
							discount: discountAmount
								? {
										distributed: { amount: discountAmount, note: null },
								  }
								: null,
							shipping: { amount: shippingAmount, note: null },
							tax: { amount: taxAmount, note: null },
							subtotalAmount,
							totalFinalAmount,
						},
						paymentStatus: saleFileUploadTemplateRow.paymentStatus
							? (saleFileUploadTemplateRow.paymentStatus.toUpperCase() as SalesEnum.PaymentStatus)
							: SalesEnum.PaymentStatus.PENDING,
						tagsIds: [],
						updatedByEmployeeId: null,
						number: 0,
						softDelete: null,
						updatedAt: now,
						updatedByUserId: null,
						noteToCustomer: saleFileUploadTemplateRow.noteToCustomer,
					};
				}

				salesToCreateByUpload.push({
					customer,
					rowNumber: saleFileUploadTemplateRow.rowNumber,
					sale,
					tags: tagsBySaleUploadTemplateRow,
				});
			} catch (error: any) {
				fileUploadTemplateErrorRow.reasons.push({
					message: `Error when attempt process row: ${error.message}`,
					property: 'other',
				});

				fileUploadTemplateErrorRows.push(fileUploadTemplateErrorRow);
			}
		}

		/**
		 * If have any error on rows, return the error rows
		 */
		if (fileUploadTemplateErrorRows.length > 0) {
			return {
				totalError: fileUploadTemplateErrorRows.length,
				totalProcessed: 0,
				totalSuccess: salesToCreateByUpload.length,
				rowsError: fileUploadTemplateErrorRows,
			};
		}

		/**
		 * Process sales to create
		 */
		let totalProcessed: number = 0;

		for await (const saleToCreateByUpload of salesToCreateByUpload) {
			const fileUploadTemplateErrorRow: IFileUploadTemplateErrorRow<ISaleFileUploadTemplateRow> =
				{
					rowNumber: saleToCreateByUpload.rowNumber,
					reasons: [],
				};

			try {
				const customer: ICustomer = await this._getUpdateCustomerOrInsert(
					saleToCreateByUpload.customer,
					ownerUserId,
				);

				const saleNumber: number =
					saleToCreateByUpload.sale.number != 0
						? saleToCreateByUpload.sale.number
						: await this._countersService.findNextNumberBySaleType();

				saleToCreateByUpload.sale.number = saleNumber;

				saleToCreateByUpload.sale.stores =
					this._setCustomerIdAndSaleNumberOnSaleStores(
						customer._id,
						saleToCreateByUpload.sale.number,
						saleToCreateByUpload.sale.stores,
					);

				const tagsIdsByExistsOrCreated: string[] =
					await this._getTagsIdsByExistsOrCreated(
						saleToCreateByUpload.tags,
						tags,
					);

				saleToCreateByUpload.sale.tagsIds = arrayStringToObjectId(
					tagsIdsByExistsOrCreated,
				) as any[];

				if (saleToCreateByUpload.sale._id) {
					await this._saleModel.findByIdAndUpdate(
						saleToCreateByUpload.sale._id,
						{
							$set: saleToCreateByUpload.sale,
						},
					);
				} else {
					await this._saleModel.create(saleToCreateByUpload.sale);
				}

				totalProcessed += 1;
			} catch (error) {
				fileUploadTemplateErrorRow.reasons.push({
					message: `[!] Error when attempt process row: ${error.message}`,
					property: 'other',
				});

				fileUploadTemplateErrorRows.push(fileUploadTemplateErrorRow);
			}
		}

		return {
			totalError: fileUploadTemplateErrorRows.length,
			totalProcessed,
			totalSuccess: salesToCreateByUpload.length,
			rowsError: fileUploadTemplateErrorRows,
		};
	}

	private _getTagsBySaleFileUploadTemplateRow(
		tagsFromRow: string,
		userId: string,
		tagsFromSale: ITag[] = [],
	): ITag[] {
		const salesTags: ITag[] = [];

		if (!tagsFromRow?.trim()) {
			return salesTags;
		}

		const now: Date = new Date();

		for (let tagFromRow of tagsFromRow.split(',')) {
			try {
				tagFromRow = tagFromRow?.trim();

				if (!tagFromRow) {
					continue;
				}

				const tagFromSale: ITag | null = find(tagsFromSale, {
					name: tagFromRow,
				});

				if (tagFromSale) {
					salesTags.push(tagFromSale);
				} else {
					const tagCreated: ITag = {
						color: TagsEnum.tagDefaultColor,
						description: null,
						name: tagFromRow,
						type: TagsEnum.Type.SALE,
						userId: userId as any,
						_id: null,
						createdAt: now,
						updatedAt: now,
					};

					salesTags.push(tagCreated);
				}
			} catch (error: any) {
				this._logger.error(error);
			}
		}

		return salesTags;
	}

	private _getPhoneNumbersByCustomerFileUploadTemplateRow(
		saleFileUploadTemplateRow: ISaleFileUploadTemplateRow,
		phoneNumbers: IPhoneNumber[] = [],
	): { phoneNumbers: IPhoneNumber[]; phoneNumber: IPhoneNumber | null } {
		const phoneNumber: string | null = saleFileUploadTemplateRow.phoneNumber
			? saleFileUploadTemplateRow.phoneNumber.toString().trim()
			: null;

		let phoneType: string | null = saleFileUploadTemplateRow.phoneType
			? saleFileUploadTemplateRow.phoneType?.toUpperCase().trim()
			: null;

		if (!phoneNumber) {
			return { phoneNumbers, phoneNumber: null };
		}

		phoneType = includes(Object.keys(PhoneNumberEnum.Type), phoneType)
			? phoneType
			: PhoneNumberEnum.Type.OTHER;

		const findPhoneNumber: IPhoneNumber | undefined = find(phoneNumbers, {
			number: phoneNumber,
			type: phoneType,
		}) as IPhoneNumber | undefined;

		if (findPhoneNumber) {
			return { phoneNumbers, phoneNumber: findPhoneNumber };
		}

		const messengers: PhoneNumberEnum.PhoneNumberMessenger[] = (
			saleFileUploadTemplateRow.phoneMessengers?.trim()
				? saleFileUploadTemplateRow.phoneMessengers
						.toUpperCase()
						.split(',')
						.map((phoneMessenger: string) => phoneMessenger.trim())
						.filter((phoneMessenger: string) =>
							includes(
								Object.keys(PhoneNumberEnum.PhoneNumberMessenger),
								phoneMessenger,
							),
						)
				: []
		) as PhoneNumberEnum.PhoneNumberMessenger[];

		const phoneNumberToCreate: IPhoneNumber = {
			messengers,
			number: phoneNumber,
			type: phoneType as PhoneNumberEnum.Type,
			uid: Date.now().toString(),
		};

		phoneNumbers.push(phoneNumberToCreate);

		return { phoneNumbers, phoneNumber: phoneNumberToCreate };
	}

	private _getAddressesByCustomerFileUploadTemplateRow(
		saleFileUploadTemplateRow: ISaleFileUploadTemplateRow,
		addresses: IAddress[] = [],
	): { addresses: IAddress[]; address: IAddress | null } {
		if (
			!(
				saleFileUploadTemplateRow.address1 ||
				saleFileUploadTemplateRow.country ||
				saleFileUploadTemplateRow.state ||
				saleFileUploadTemplateRow.city ||
				saleFileUploadTemplateRow.zipCode ||
				saleFileUploadTemplateRow.district
			)
		) {
			return { addresses, address: null };
		}

		const findAddress: IAddress | undefined = find(
			addresses,
			(address: IAddress) =>
				address.address1 === saleFileUploadTemplateRow.address1 &&
				address.country.code === saleFileUploadTemplateRow.country &&
				address.state.code === saleFileUploadTemplateRow.state &&
				address.city === saleFileUploadTemplateRow.city &&
				address.zip === saleFileUploadTemplateRow.zipCode &&
				address.district === saleFileUploadTemplateRow.district,
		) as IAddress | undefined;

		if (findAddress) {
			return { addresses, address: findAddress };
		}

		saleFileUploadTemplateRow.address1 =
			saleFileUploadTemplateRow.address1?.trim();
		saleFileUploadTemplateRow.country =
			saleFileUploadTemplateRow.country?.trim();
		saleFileUploadTemplateRow.state = saleFileUploadTemplateRow.state?.trim();
		saleFileUploadTemplateRow.city = saleFileUploadTemplateRow.city?.trim();
		saleFileUploadTemplateRow.zipCode =
			saleFileUploadTemplateRow.zipCode &&
			String(saleFileUploadTemplateRow.zipCode)?.trim();
		saleFileUploadTemplateRow.district =
			saleFileUploadTemplateRow.district?.trim();

		const country: ICountryMockData = find(
			countries,
			(country: ICountryMockData) =>
				country.code === saleFileUploadTemplateRow.country ||
				country.name === saleFileUploadTemplateRow.country,
		) ?? {
			code: saleFileUploadTemplateRow.country,
			name: saleFileUploadTemplateRow.country,
		};

		const state: IStateMockData = find(
			states,
			(state: IStateMockData) =>
				state.code === saleFileUploadTemplateRow.state ||
				state.name === saleFileUploadTemplateRow.state,
		) ?? {
			code: saleFileUploadTemplateRow.state,
			name: saleFileUploadTemplateRow.state,
		};

		const types: AddressEnum.Type[] = (
			saleFileUploadTemplateRow.addressTypes
				? saleFileUploadTemplateRow.addressTypes
						.toUpperCase()
						.split(',')
						.map((addressType: string) => addressType.trim())
						.filter((addressType: string) =>
							includes(Object.keys(AddressEnum.Type), addressType),
						)
				: []
		) as AddressEnum.Type[];

		const addressToCreate: IAddress = {
			address1: saleFileUploadTemplateRow.address1,
			address2: saleFileUploadTemplateRow.address2,
			city: saleFileUploadTemplateRow.city,
			country,
			description: saleFileUploadTemplateRow.addressDescription,
			district: saleFileUploadTemplateRow.district,
			isValid: true,
			state,
			uid: Date.now().toString(),
			zip: saleFileUploadTemplateRow.zipCode.toString(),
			types,
		};

		addresses.push(addressToCreate);

		return { addresses, address: addressToCreate };
	}

	private async _parseSelectedProductsToSaleStores({
		customer,
		ownerUserId,
		selectedProducts,
		storesFromUser,
		discountAmount,
		shippingAmount,
		taxAmount,
	}: {
		ownerUserId: string;
		selectedProducts: ISaleFileUploadTemplateSelectedProductFormat[];
		storesFromUser: IStore[];
		customer: ICustomer;
		discountAmount: number;
		shippingAmount: number;
		taxAmount: number;
	}): Promise<ISaleStore[]> {
		const barcodes: string[] = reduce(
			selectedProducts,
			(acc: string[], curr: ISaleFileUploadTemplateSelectedProductFormat) => {
				acc.push(...map(curr.products, 'barcode'));
				return acc;
			},
			[],
		);

		const productItems: IProductItem[] =
			await this._productItemsService.findByUserIdAndBarcodes(
				ownerUserId,
				barcodes,
			);

		const saleStoresLength: number = selectedProducts?.length ?? 0;

		const discountAmountByStore: number = discountAmount / saleStoresLength;

		const shippingAmountByStore: number = shippingAmount / saleStoresLength;

		const taxAmountByStore: number = taxAmount / saleStoresLength;

		return map(
			selectedProducts,
			(
				selectedProduct: ISaleFileUploadTemplateSelectedProductFormat,
			): ISaleStore => {
				const store: IStore | undefined = find(
					storesFromUser,
					(store: IStore) =>
						store.name.toUpperCase().trim() ===
						selectedProduct.store.toUpperCase().trim(),
				);

				if (!store) {
					throw new Error(`Store not found by name: ${selectedProduct.store}`);
				}

				const productsQuantityPrice: ISaleStoresProductsTotals = reduce(
					selectedProduct.products,
					(
						acc: ISaleStoresProductsTotals,
						selectedProductProduct: ISaleFileUploadTemplateSelectedProductItemFormat,
					) => {
						acc.quantity += selectedProductProduct.quantity;
						acc.subtotal +=
							selectedProductProduct.price * selectedProductProduct.quantity;
						return acc;
					},
					{
						quantity: 0,
						subtotal: 0,
					},
				);

				const getTotalAfterDiscountByStore = (): number => {
					const totalAfterDiscount: number =
						productsQuantityPrice.subtotal - discountAmountByStore;

					return totalAfterDiscount > 0 ? totalAfterDiscount : 0;
				};

				const totalAfterDiscountByStore: number =
					getTotalAfterDiscountByStore();

				const getTotalFinalByStore = (): number => {
					const totalFinal: number =
						totalAfterDiscountByStore +
						shippingAmountByStore +
						taxAmountByStore;

					return totalFinal > 0 ? totalFinal : 0;
				};

				const totalFinalAmountByStore: number = getTotalFinalByStore();

				const saleStoreProducts: ISaleStoreProduct[] = map(
					selectedProduct.products,
					(
						selectedProduct: ISaleFileUploadTemplateSelectedProductItemFormat,
					): ISaleStoreProduct => {
						const productItem: IProductItem | undefined = find(
							productItems,
							(productItemIterator: IProductItem) =>
								productItemIterator.barcode.toUpperCase().trim() ===
								selectedProduct.barcode.toUpperCase().trim(),
						);

						if (!productItem) {
							throw new Error(
								`Product item not found by barcode: ${selectedProduct.barcode}`,
							);
						}

						const saleStoreProductPercentage: number = getPercentageByValue(
							selectedProduct.price * selectedProduct.quantity,
							productsQuantityPrice.subtotal,
						);

						const discountByPercentage: number = getValueByPercentage(
							saleStoreProductPercentage,
							discountAmountByStore,
						);

						return {
							barcode: selectedProduct.barcode,
							note: null,
							price: selectedProduct.price,
							quantity: selectedProduct.quantity,
							productId: productItem.productId as any,
							discount: discountByPercentage
								? {
										distributedAmount: +discountByPercentage.toFixed(2),
								  }
								: null,
							isCompleted: true,
							isValid: true,
							sku: productItem.sku,
							productItemId: productItem._id as any,
						};
					},
				);

				return {
					products: saleStoreProducts,
					customerId: (customer?._id ?? null) as any,
					number: 0,
					storeId: store._id as any,
					totals: {
						discount: discountAmountByStore
							? {
									distributedAmount: discountAmountByStore,
							  }
							: null,
						shipping: {
							amount: shippingAmountByStore,
							note: null,
						},
						subtotalAmount: productsQuantityPrice.subtotal,
						tax: { amount: taxAmountByStore, note: null },
						totalFinalAmount: totalFinalAmountByStore,
					},
				};
			},
		);
	}

	private _setCustomerIdAndSaleNumberOnSaleStores(
		customerId: string,
		saleNumber: number,
		saleStores: ISaleStore[],
	): ISaleStore[] {
		return map(saleStores, (saleStore: ISaleStore): ISaleStore => {
			saleStore.customerId = customerId as any;
			saleStore.number = saleNumber;
			return saleStore;
		});
	}

	private async _getTagsIdsByExistsOrCreated(
		tagsToVerify: ITag[],
		tagsFromSale: ITag[],
	): Promise<string[]> {
		const tagsIds: string[] = [];

		for await (const tagToVerify of tagsToVerify) {
			try {
				const tagFromSale: ITag | null = find(tagsFromSale, {
					name: tagToVerify.name,
				});

				if (tagFromSale) {
					tagsIds.push(tagFromSale._id);
				} else {
					const tagCreated: ITag = await this._tagsService.create({
						color: TagsEnum.tagDefaultColor,
						description: null,
						name: tagToVerify.name,
						type: TagsEnum.Type.SALE,
						userId: tagToVerify.userId as any,
					});

					tagsFromSale.push(tagCreated);
					tagsIds.push(tagCreated._id);
				}
			} catch (error) {
				this._logger.error(error);
			}
		}

		return tagsIds;
	}

	private _getRowSelectedProductsValidated(
		selectedProducts: ISaleFileUploadTemplateSelectedProductFormat[],
	): ISaleFileUploadTemplateSelectedProductFormat[] {
		for (const selectedProduct of selectedProducts) {
			if (!selectedProduct.store) {
				throw new Error('Store is required!');
			}
			selectedProduct.store = selectedProduct.store?.trim();
			if (!selectedProduct.store) {
				throw new Error('Store invalid format!');
			}
			if (!selectedProduct.products) {
				throw new Error('Products is required!');
			}
			if (!isArray(selectedProduct.products)) {
				throw new Error('Products invalid format!');
			}
			if (selectedProduct.products.length === 0) {
				throw new Error('Products empty list!');
			}

			for (const product of selectedProduct.products) {
				product.barcode = product.barcode?.trim();
				if (!product.barcode) {
					throw new Error('Product barcode invalid format!');
				}

				product.price = parseFloat(product.price.toString());
				if (isNaN(product.price)) {
					throw new Error('Product price invalid format!');
				}

				product.quantity = parseInt(product.quantity.toString(), 10);
				if (isNaN(product.quantity)) {
					throw new Error('Product quantity invalid format!');
				}
			}
		}

		return selectedProducts;
	}

	private _getRowPaymentsValidated(
		payments: ISaleFileUploadTemplateRowPaymentFormat[],
	): ISaleFileUploadTemplateRowPaymentFormat[] {
		for (const payment of payments) {
			if (!payment.type) {
				throw new Error('Payment type is required!');
			}

			payment.type = payment.type.toUpperCase().trim() as SalesEnum.PaymentType;

			if (!includes(Object.keys(SalesEnum.PaymentType), payment.type)) {
				throw new Error('Payment type invalid!');
			}

			payment.amount = parseFloat(payment.amount.toString());

			if (isNaN(payment.amount)) {
				throw new Error('Payment amount invalid format!');
			}
		}

		return payments;
	}

	private async _getUpdateCustomerOrInsert(
		customerToUpdateOrInsert: ICustomer,
		ownerUserId: string,
	): Promise<ICustomer> {
		/**
		 * Attempt find customer by id or by properties if not find must create
		 */
		if (customerToUpdateOrInsert._id) {
			return this._customersService.findByIdAndUpdate(
				customerToUpdateOrInsert._id,
				{
					$addToSet: {
						addresses: customerToUpdateOrInsert.addresses,
						phoneNumbers: customerToUpdateOrInsert.phoneNumbers,
					},
				},
				{
					new: true,
				},
			);
		}

		/**
		 * That code is used because customer can be created by upload
		 */
		const customer: ICustomer | null =
			customerToUpdateOrInsert.name &&
			customerToUpdateOrInsert.email &&
			customerToUpdateOrInsert.birthDate
				? await this._customersService.findByMainPropertiesAndOwnerUserId(
						customerToUpdateOrInsert.name,
						customerToUpdateOrInsert.email,
						customerToUpdateOrInsert.birthDate,
						ownerUserId,
				  )
				: null;

		if (customer) {
			return this._customersService.findByIdAndUpdate(
				customer._id,
				{
					$addToSet: {
						addresses: customerToUpdateOrInsert.addresses,
						phoneNumbers: customerToUpdateOrInsert.phoneNumbers,
					},
				},
				{
					new: true,
				},
			);
		}

		return this._customersService.insert(customerToUpdateOrInsert);
	}

	// #endregion

	// #region Download

	public async downloadSales(
		userId: string,
		filters: IFiltersDownloadSales,
	): Promise<Buffer> {
		const stores: IStore[] =
			await this._storesService.findStoresByUserId(userId);

		const filter: FilterQuery<ISale> = {
			$or: [
				{ createdByUserId: userId },
				{
					'stores.storeId': { $in: map(stores, '_id') },
				},
			],
		};

		if (filters.search) {
			const search = new RegExp(filters.search, 'ig');

			filter.$or = [
				{
					description: search,
				},
				{
					'buyer.name': search,
				},
				{
					'buyer.email': search,
				},
			];

			if (isNumber(+filters.search)) {
				filter.$or.push({
					number: +filters.search,
				});
			}
		}

		if (filters.types?.length) {
			filter.type = { $in: filters.types };
		}

		if (filters.status?.length) {
			filter.status = { $in: filters.status };
		}

		if (filters.paymentStatus?.length) {
			filter.paymentStatus = { $in: filters.paymentStatus };
		}

		if (filters.deliveryTypes?.length) {
			filter['header.deliveryType'] = { $in: filters.deliveryTypes };
		}

		if (filters.storeIds?.length) {
			filter['stores.storeId'] = { $in: filters.storeIds };
		}

		if (filters.rangeDate) {
			const { startDate, endDate } = filters.rangeDate;
			const filterRangeField: string = filters?.rangeField ?? 'createdAt';

			filter[filterRangeField] = {
				$gte: new Date(startDate),
				$lte: new Date(endDate),
			};
		}

		if (filters.tagsIds?.length) {
			filter.tagsIds = { $in: filters.tagsIds };
		}

		if (filters.selectedProductIds?.length) {
			filter['stores.products.productId'] = {
				$in: filters.selectedProductIds,
			};
		}

		if (filters.selectedProductItemIds?.length) {
			filter['stores.products.productItemId'] = {
				$in: filters.selectedProductItemIds,
			};
		}

		if (filters.customerIds?.length) {
			filter['stores.customerId'] = {
				$in: filters.customerIds,
			};
		}

		if (filters.isActive) {
			filter.softDelete =
				filters.isActive === CommonEnum.YesNo.YES ? null : { $ne: null };
		}

		if (filters.employeeIds?.length) {
			filter.createdByEmployeeId = {
				$in: filters.employeeIds,
			};
		}

		let sales: ISale[] = await this._saleModel
			.find(
				filter,
				null,
				queryOptionsBySort<ISale>({
					field: filters.sortField as any,
					order: filters.sortOrder,
				}),
			)
			.populate({
				path: 'stores.customerId',
				model: 'Customer',
			})
			.populate({
				path: 'stores.products.productId',
				model: 'Product',
			});

		sales = parsePopulatedSales(sales);

		const workbook: ExcelJS.Workbook = new ExcelJS.Workbook();
		const worksheet: ExcelJS.Worksheet = workbook.addWorksheet('Data');

		const columns = {
			number: 'Number',
			numberManual: 'Number Manual',
			uniqName: 'Uniq Name',
			name: 'Name',
			email: 'Email',
			birthDate: 'Birth Date',
			gender: 'Gender',
			about: 'About',
			country: 'Country',
			state: 'State',
			city: 'City',
			zipCode: 'Zip Code',
			address1: 'Address1',
			address2: 'Address2',
			district: 'District',
			addressDescription: 'Address Description',
			addressTypes: 'Address Types',
			phoneType: 'Phone Type',
			phoneNumber: 'Phone Number',
			phoneMessengers: 'Phone Messengers',
			selectedProducts: 'Selected Products',
			discount: 'Discount',
			shipping: 'Shipping',
			tax: 'Tax',
			payments: 'Payments',
			note: 'Note',
			tags: 'Tags',
			saleStatus: 'Sale Status',
			paymentStatus: 'Payment Status',
			completedAt: 'Completed At',
			deliveryDate: 'Delivery Date',
			deliveryType: 'Delivery Type',
			createdDate: 'Created Date',
			createdAt: 'Created At',
			subtotal: 'Subtotal',
			totalFinal: 'Total Final',
		};

		const sheetColumns: any[] = [];

		for (const columnKey in columns) {
			sheetColumns.push({
				header: columns[columnKey],
				key: columnKey,
				width: columnKey,
			});
		}

		worksheet.columns = sheetColumns;

		const tags: ITag[] = await this._tagsService.findByType(
			userId,
			TagsEnum.Type.SALE,
		);

		for (const sale of sales) {
			const tagsNames: string = reduce(
				sale.tagsIds,
				(acc: string, tagId, index: number) => {
					const tag = find(
						tags,
						(tagParam) => tagParam._id.toString() === tagId.toString(),
					) as ITag | undefined;

					const isLastIndex: boolean = sale.tagsIds.length - 1 === index;

					if (tag) {
						acc += `${tag.name}${isLastIndex ? '' : ', '}`;
					}

					return acc;
				},
				'',
			);

			const customer: ICustomer | null = await this._customersService.findById(
				sale.stores[0].customerId as any,
			);

			const birthDate: Date | null =
				customer?.birthDate ?? sale.buyer.birthDate;

			worksheet.addRow({
				number: sale.number,
				numberManual: sale.numberManual ?? '',
				uniqName: customer?.uniqName ?? '',
				name: customer?.name ?? sale.buyer.name ?? '',
				email: customer?.email ?? sale.buyer.email,
				birthDate: moment(birthDate).format(DatesEnum.Format.MMDDYYYY),
				gender: PersonEnum.GenderLabels[customer?.gender ?? sale.buyer.gender],
				about: customer?.about,
				country: sale.buyer.address?.country?.name ?? '',
				state: sale.buyer.address?.state?.name,
				city: sale.buyer.address?.city,
				zipCode: sale.buyer.address?.zip,
				address1: sale.buyer.address?.address1,
				address2: sale.buyer.address?.address2,
				district: sale.buyer.address?.district,
				addressDescription: sale.buyer.address?.description,
				addressTypes: sale.buyer.address.types?.length
					? map(
							sale.buyer.address.types,
							(type: AddressEnum.Type) => AddressEnum.TypesLabels[type],
					  ).join(', ')
					: '',
				phoneType: sale.buyer.phoneNumber?.type
					? PhoneNumberEnum.TypeLabels[sale.buyer.phoneNumber.type]
					: '',
				phoneNumber: sale.buyer.phoneNumber?.number ?? '',
				phoneMessengers: sale.buyer.phoneNumber?.messengers?.length
					? map(
							sale.buyer.phoneNumber.messengers,
							(messenger: PhoneNumberEnum.PhoneNumberMessenger) =>
								PhoneNumberEnum.PhoneNumberMessengerLabels[messenger],
					  ).join(', ')
					: '',
				selectedProducts: map(sale.stores, (saleStore: ISaleStore) => {
					const findStore: IStore | undefined = find(
						stores,
						(store: IStore) =>
							store._id.toString() === saleStore.storeId.toString(),
					) as IStore | undefined;

					return {
						store: findStore?.name ?? '',
						products: map(
							saleStore.products,
							(saleStoreProduct: ISaleStoreProduct) => {
								return {
									barcode: saleStoreProduct?.barcode
										? `${saleStoreProduct.isValid ? '' : 'Invalid - '}${
												saleStoreProduct.barcode
										  }`
										: '',
									quantity: saleStoreProduct.quantity,
									price: saleStoreProduct.price.toFixed(2),
									sku: saleStoreProduct.sku,
								};
							},
						),
					};
				}),
				discount: sale.totals.discount?.distributed.amount
					? sale.totals.discount?.distributed.amount.toFixed(2)
					: 0,
				shipping: sale.totals.shipping.amount
					? sale.totals.shipping.amount.toFixed(2)
					: 0,
				tax: sale.totals.tax.amount ? sale.totals.tax.amount.toFixed(2) : 0,
				payments: sale.payments.length
					? map(sale.payments, (payment: ISalePayment) => {
							return {
								type: SalesEnum.PaymentTypeLabels[payment.type],
								amount: payment.amount.toFixed(2),
							};
					  })
					: '',
				note: sale.note,
				tags: tagsNames,
				saleStatus: SalesEnum.StatusLabels[sale.status],
				paymentStatus: SalesEnum.PaymentStatusLabels[sale.paymentStatus],
				completedAt: sale.completedAt
					? moment(sale.completedAt).format(
							DatesEnum.Format.YYYYMMDDhhmmss_DASHED,
					  )
					: '',
				deliveryDate: sale.deliveryAt
					? moment(sale.deliveryAt).format(
							DatesEnum.Format.YYYYMMDDhhmmss_DASHED,
					  )
					: '',
				deliveryType: sale.header.deliveryType
					? SalesEnum.DeliveryTypeLabels[sale.header.deliveryType]
					: '',
				createdDate: moment(sale.createdDate).format(
					DatesEnum.Format.YYYYMMDDhhmmss_DASHED,
				),
				createdAt: moment(sale.createdAt).format(
					DatesEnum.Format.YYYYMMDDhhmmss_DASHED,
				),
				subtotal: sale.totals.subtotalAmount.toFixed(2),
				totalFinal: sale.totals.totalFinalAmount.toFixed(2),
			});
		}

		worksheet.addRow({
			subtotal: reduce(
				sales,
				(acc: number, sale: ISale) => {
					return acc + sale.totals.subtotalAmount;
				},
				0,
			).toFixed(2),
			shipping: reduce(
				sales,
				(acc: number, sale: ISale) => {
					return acc + sale.totals.shipping.amount;
				},
				0,
			).toFixed(2),
			tax: reduce(
				sales,
				(acc: number, sale: ISale) => {
					return acc + sale.totals.tax.amount;
				},
				0,
			).toFixed(2),
			discount: reduce(
				sales,
				(acc: number, sale: ISale) => {
					return acc + (sale.totals.discount?.distributed?.amount ?? 0);
				},
				0,
			).toFixed(2),
			totalFinal: reduce(
				sales,
				(acc: number, sale: ISale) => {
					return acc + sale.totals.totalFinalAmount;
				},
				0,
			).toFixed(2),
		});

		const buffer = await workbook.xlsx.writeBuffer();
		return buffer as Buffer;
	}

	public async downloadSaleSummaryPdf(saleId: string): Promise<ISalePdf> {
		const sale: ISale = await this.findFilledByIdOrFail(saleId);

		const saleSummaryTemplate: ISaleSummaryTemplate =
			getSaleSummaryTemplate(sale);

		const pdfBuffer: Buffer = await generatePdfBuffer({
			getHtmlFromTemplateParams: {
				data: saleSummaryTemplate,
				relativePath: TemplatesEnum.RelativePath.SALE_SUMMARY_HBS,
			},
		});

		return { sale, pdfBuffer };
	}

	public async sendSaleSummaryLink(
		sendSaleSummaryLinkRequest: ISendSaleSummaryLinkRequest,
	): Promise<void> {
		if (!isValidEmail(sendSaleSummaryLinkRequest.toEmail)) {
			throw new BadRequestException('Invalid Email!');
		}

		const { saleId, toEmail } = sendSaleSummaryLinkRequest;

		const sale: ISale = await this.findByIdOrFail(saleId);

		const token: string = this._hashCrypt.encryptWithExpirationDays({
			saleId: sale._id,
		});

		await this._notificationsService.sendSaleSummaryLink(sale, toEmail, token);
	}

	public async getSaleBySaleSummaryLinkToken(token: string): Promise<ISale> {
		const { saleId } = this._hashCrypt.decryptAndValidateExpiration<{
			saleId: string;
			exp: number;
		}>(token);

		const sale: ISale = await this.findFilledByIdOrFail(saleId);

		return sale;
	}

	//#endregion
}

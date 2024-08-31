import { isNumber } from 'class-validator';
import { find, flatMap, forEach, includes, map, orderBy, reduce } from 'lodash';
import mongoose, { FilterQuery, Model } from 'mongoose';

import {
	BadRequestException,
	Injectable,
	Logger,
	NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { schemasName } from '../../infra/database/mongo/schemas';
import { CreateAddressDto } from '../../shared/dtos/CreateAddress.dto';
import { IAddress } from '../../shared/interfaces/address.interface';
import { parseToChartDataPeriodTypeItem } from '../../shared/utils/charts/charts';
import ChartsEnum from '../../shared/utils/charts/charts-enum';
import {
	IChartDataPeriodTypeItem,
	IChartDataProductItem,
	IChartDateTotalItem,
	IChartTotalAndQuantity,
} from '../../shared/utils/charts/charts-types';
import { queryOptions } from '../../shared/utils/table/table-state';
import {
	ITableStateRequest,
	ITableStateResponse,
} from '../../shared/utils/table/table-state.interface';
import { CountersService } from '../counters/counters.service';
import { CustomersService } from '../customers/customers.service';
import { ICustomer } from '../customers/interfaces/customer.interface';
import CreateCustomerDto from '../customers/interfaces/dto/createCustomer.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { IProduct } from '../products/interfaces/product.interface';
import { ProductsService } from '../products/products.service';
import { IStore } from '../stores/interfaces/store.interface';
import { StoresService } from '../stores/stores.service';
import { IUser } from '../users/interfaces/user.interface';
import { UsersService } from '../users/users.service';
import CreateSaleDto, {
	SaleStoreDto,
	SaleStoreProductDto,
} from './interfaces/dto/createSale.dto';
import UpdateSaleDto from './interfaces/dto/updateSale.dto';
import {
	ISale,
	ISaleStore,
	ISaleStoreProduct,
} from './interfaces/sale.interface';
import { Sale } from './interfaces/sale.schema';
import {
	IGetSalesAnalyticsParams,
	IGetSalesAnalyticsResponse,
	IProductQuantity,
	IProductToSubtract,
	ISaleStoreProductString,
} from './interfaces/sales.type';

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
		private readonly _countersService: CountersService,
	) {
		this._logger = new Logger(SalesService.name);
	}

	// #endregion

	// #region Public Methods

	public async findById(saleId: string): Promise<ISale | null> {
		return this._saleModel.findById(saleId);
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
			softDelete: null,
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

		if (tableState.filters?.createdAtRange) {
			const { startDate, endDate } = tableState.filters.createdAtRange;
			filter.createdAt = { $gte: startDate, $lte: endDate };
		}

		if (tableState?.filters?.tagsIds?.length) {
			filter.tagsIds = { $in: tableState.filters.tagsIds };
		}

		const response: ITableStateResponse<ISale[]> = {
			data: [],
			total: 0,
		};

		response.total = await this._saleModel.countDocuments(filter);

		let sales: ISale[] = await this._saleModel
			.find(filter, null, queryOptions<ISale>(tableState))
			.populate({
				path: 'stores.customerId',
				model: 'Customer',
			})
			.populate({
				path: 'stores.products.productId',
				model: 'Product',
			});

		sales = JSON.parse(JSON.stringify(sales));

		sales.forEach((sale: ISale) => {
			sale.stores = JSON.parse(JSON.stringify(sale.stores)).map(
				(store: ISaleStore) => {
					store.products = JSON.parse(JSON.stringify(store.products)).map(
						(product: ISaleStoreProduct) => {
							return {
								...product,
								product: product.productId,
							};
						},
					);

					return {
						...store,
						customer: store.customerId,
					};
				},
			);
		});

		response.data = sales;

		return response;
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

			const saleToCreate = {
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
				tagsIds: createSaleDto.tagsIds,
				createdByEmployeeId: createSaleDto.createdByEmployeeId,
			};

			const saleModel = new this._saleModel(saleToCreate);

			const newSale: ISale = await saleModel.save();

			await this._subtractProductsQuantityBySaleStores(saleStores);

			const userIdByStores: string = stores[0].userId.toString();

			const user: IUser =
				await this._usersService.findOneByIdOrFail(userIdByStores);

			await this._notificationsService.createdManualSale(newSale, user);

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
				tagsIds: updateSaleDto.tagsIds,
				updatedByEmployeeId: updateSaleDto.updatedByEmployeeId,
			};

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

			await this._notificationsService.updatedManualSale(updatedSale, user);

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

			const storeIds: string[] = map(sale.stores, (saleStore: ISaleStore) =>
				saleStore.storeId.toString(),
			);

			const stores: IStore[] = await this._storesService.findByIds(storeIds);

			const userIdByStores: string = stores[0].userId.toString();

			const userIdOwnerStore: IUser =
				await this._usersService.findOneByIdOrFail(userIdByStores);

			await this._notificationsService.deletedSale(sale, userIdOwnerStore);

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
		let storesIds: string[] = params.storesIds?.length
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
			filter.createdAt = { $gte: startDate, $lte: endDate };
		}

		if (params.tagsIds?.length) {
			filter.tagsIds = { $in: params.tagsIds };
		}

		if (params.productIds?.length) {
			filter['stores.products.productId'] = { $in: params.productIds };
		}

		let sales: ISale[] = await this._saleModel.find(filter);

		const chartDataPeriodType: IChartDataPeriodTypeItem[] =
			this._parseSalesToChartDataPeriodType(
				sales,
				storesIds,
				params.periodType,
			);

		const chartDataProducts = await this._parseSalesToChartDataProducts(
			sales,
			storesIds,
		);

		return {
			chartDataPeriodType,
			...chartDataProducts,
		};
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

		const userByEmail: IUser | undefined =
			createSaleDto.buyer && !createSaleDto.buyer?.userId
				? await this._usersService.findOneByEmail(createSaleDto.buyer.email)
				: undefined;

		const createSaleDtoBuyerUserId: string | undefined =
			createSaleDto.buyer?.userId;

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

			// When created by owner of store and owner is making a buy in a shopping of another store users or in his own store
			if (!createSaleDto.buyer) {
				customer = await this._customersService.findByOwnerUserIdAndUserId(
					storeUserId,
					createSaleDto.createdByUserId,
				);
			} else {
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
		const productsToSubtract: IProductToSubtract[] = reduce(
			saleStores,
			(acc: IProductToSubtract[], saleStore: ISaleStore) => {
				forEach(
					saleStore.products,
					(saleStoreProduct: ISaleStoreProduct): void => {
						const findProductToSubtract: IProductToSubtract | undefined = find(
							acc,
							{
								productId: saleStoreProduct.productId,
							},
						) as IProductToSubtract | undefined;

						if (findProductToSubtract) {
							findProductToSubtract.quantity += saleStoreProduct.quantity;
						} else {
							acc.push({
								productId: saleStoreProduct.productId.toString(),
								quantity: saleStoreProduct.quantity,
							});
						}
					},
				);

				return acc;
			},
			[],
		);

		for await (const productToSubtract of productsToSubtract) {
			await this._productsService.updateOne(
				new mongoose.Types.ObjectId(productToSubtract.productId),
				{
					$inc: {
						quantity: -productToSubtract.quantity,
					},
				},
				{
					new: true,
				},
			);
		}
	}

	private async _updateProductsQuantityByUpdateManualSale(
		saleStoresDto: SaleStoreDto[],
		saleStores: ISaleStore[],
	): Promise<void> {
		// Format all products on previous state of sale stores to productId and quantity
		const productsQuantityBySaleStores: IProductQuantity[] = reduce(
			saleStores,
			(acc: IProductQuantity[], saleStore: ISaleStore) => {
				forEach(
					saleStore.products,
					(saleStoreProduct: ISaleStoreProduct): void => {
						const findProductToSubtract: IProductQuantity | undefined = find(
							acc,
							{
								productId: saleStoreProduct.productId,
							},
						) as IProductToSubtract | undefined;

						if (findProductToSubtract) {
							findProductToSubtract.quantity += saleStoreProduct.quantity;
						} else {
							acc.push({
								productId: saleStoreProduct.productId.toString(),
								quantity: saleStoreProduct.quantity,
							});
						}
					},
				);

				return acc;
			},
			[],
		);

		// Format all products on sale stores dto to productId and quantity
		const productsQuantityBySaleStoresDto: IProductQuantity[] = reduce(
			saleStoresDto,
			(acc: IProductQuantity[], saleStoreDto: SaleStoreDto) => {
				forEach(
					saleStoreDto.products,
					(saleStoreProductDto: SaleStoreProductDto): void => {
						const findProductToSubtract: IProductQuantity | undefined = find(
							acc,
							{
								productId: saleStoreProductDto.productId,
							},
						);

						if (findProductToSubtract) {
							findProductToSubtract.quantity += saleStoreProductDto.quantity;
						} else {
							acc.push({
								productId: saleStoreProductDto.productId,
								quantity: saleStoreProductDto.quantity,
							});
						}
					},
				);

				return acc;
			},
			[],
		);

		// Make a logic to put a quantity by product and to increment or decrement based on state of new quantity
		const productsToSubtract: IProductToSubtract[] = reduce(
			productsQuantityBySaleStoresDto,
			(
				acc: IProductToSubtract[],
				productQuantityBySaleStoreDto: IProductQuantity,
			) => {
				const findProductQuantityBySaleStores: IProductQuantity | undefined =
					find(productsQuantityBySaleStores, {
						productId: productQuantityBySaleStoreDto.productId,
					});

				if (findProductQuantityBySaleStores) {
					acc.push({
						productId: findProductQuantityBySaleStores.productId,
						quantity:
							productQuantityBySaleStoreDto.quantity -
							findProductQuantityBySaleStores.quantity,
					});
				} else {
					acc.push({
						productId: productQuantityBySaleStoreDto.productId,
						quantity: productQuantityBySaleStoreDto.quantity,
					});
				}

				return acc;
			},
			[],
		);

		// Add new products to subtract when product was removed from sale stores
		productsQuantityBySaleStores.forEach(
			(productQuantityBySaleStores: IProductQuantity) => {
				const productToSubtract: IProductToSubtract | undefined = find(
					productsToSubtract,
					{ productId: productQuantityBySaleStores.productId },
				);

				if (!productToSubtract) {
					productsToSubtract.push({
						productId: productQuantityBySaleStores.productId,
						quantity: -productQuantityBySaleStores.quantity,
					});
				}
			},
		);

		// Increment or decrement quantity products
		for await (const productToSubtract of productsToSubtract) {
			await this._productsService.updateOne(
				new mongoose.Types.ObjectId(productToSubtract.productId),
				{
					$inc: {
						quantity: -productToSubtract.quantity,
					},
				},
				{
					new: true,
				},
			);
		}
	}

	private _parseSalesToChartDataPeriodType(
		sales: ISale[],
		storeIds: string[],
		periodType: ChartsEnum.PeriodType,
	): IChartDataPeriodTypeItem[] {
		const chartDataItems: IChartDateTotalItem[] = reduce(
			sales,
			(acc: IChartDateTotalItem[], sale: ISale) => {
				const totalAndQuantity = sale.stores.reduce(
					(acc: IChartTotalAndQuantity, saleStore: ISaleStore) => {
						if (includes(storeIds, saleStore.storeId.toString())) {
							acc.total += saleStore.totals.totalFinalAmount;
							acc.quantity += reduce(
								saleStore.products,
								(acc2, curr2) => (acc2 += curr2.quantity),
								0,
							);
						}

						return acc;
					},
					{
						total: 0,
						quantity: 0,
					},
				);

				acc.push({
					date: sale.createdAt,
					...totalAndQuantity,
				});

				return acc;
			},
			[],
		);

		return parseToChartDataPeriodTypeItem(chartDataItems, periodType);
	}

	private async _parseSalesToChartDataProducts(
		sales: ISale[],
		storeIds: string[],
	): Promise<{
		chartDataProductsByTotal: IChartDataProductItem[];
		chartDataProductsByQuantity: IChartDataProductItem[];
	}> {
		let salesStoresProducts: ISaleStoreProduct[] = flatMap(
			sales,
			(sale: ISale) =>
				flatMap(sale.stores, (saleStore: ISaleStore) => {
					if (includes(storeIds, saleStore.storeId.toString())) {
						return saleStore.products;
					}

					return [];
				}),
		);

		const salesStoresProductsString: ISaleStoreProductString[] = map(
			salesStoresProducts,
			(saleStoreProduct: ISaleStoreProduct): ISaleStoreProductString => ({
				barCode: saleStoreProduct.barCode,
				note: saleStoreProduct.note,
				price: saleStoreProduct.price,
				quantity: saleStoreProduct.quantity,
				productId: saleStoreProduct.productId.toString(),
			}),
		);

		let chartDataProductItems: IChartDataProductItem[] = reduce(
			salesStoresProductsString,
			(
				acc: IChartDataProductItem[],
				saleStoreProduct: ISaleStoreProductString,
			) => {
				const findChartDataProductItem: IChartDataProductItem | undefined =
					find(acc, {
						productId: saleStoreProduct.productId,
					}) as IChartDataProductItem | undefined;

				if (findChartDataProductItem) {
					findChartDataProductItem.total +=
						saleStoreProduct.price * saleStoreProduct.quantity;
					findChartDataProductItem.quantity += saleStoreProduct.quantity;
				} else {
					acc.push({
						quantity: saleStoreProduct.quantity,
						name: saleStoreProduct.barCode,
						productId: saleStoreProduct.productId.toString(),
						total: saleStoreProduct.price * saleStoreProduct.quantity,
						mainUrl: '',
					});
				}

				return acc;
			},
			[],
		);

		let chartDataProductsByTotal: IChartDataProductItem[] =
			await this._chartDataProductItemsByOrderProperty(
				chartDataProductItems,
				'total',
			);
		let chartDataProductsByQuantity: IChartDataProductItem[] =
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
	) {
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

				if (product) {
					return {
						...item,
						name: product.name,
						mainUrl: product.mainUrl,
					};
				}
				return item;
			},
		);

		return chartDataProductItemsByOrder;
	}

	// #endregion
}

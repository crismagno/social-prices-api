import { find, map } from 'lodash';
import { FilterQuery, Model } from 'mongoose';

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
import { queryOptions } from '../../shared/utils/table/table-state';
import {
	ITableStateRequest,
	ITableStateResponse,
} from '../../shared/utils/table/table-state.interface';
import { CustomersService } from '../customers/customers.service';
import { ICustomer } from '../customers/interfaces/customer.interface';
import CreateCustomerDto from '../customers/interfaces/dto/createCustomer.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { IStore } from '../stores/interfaces/store.interface';
import { StoresService } from '../stores/stores.service';
import { IUser } from '../users/interfaces/user.interface';
import { UsersService } from '../users/users.service';
import CreateSaleDto, { SaleStoreDto } from './interfaces/dto/createSale.dto';
import { ISale, ISaleStore } from './interfaces/sale.interface';
import { Sale } from './interfaces/sale.schema';

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
	) {
		this._logger = new Logger(SalesService.name);
	}

	// #endregion

	// #region Public Methods

	public async findById(saleId: string): Promise<ISale | undefined> {
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
		const sale: ISale | undefined = await this.findById(saleId);

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
		};

		if (tableState.search) {
			const search = new RegExp(tableState.search, 'ig');

			filter.$or = [
				{
					description: search,
				},
				{
					number: search,
				},
			];
		}

		const response: ITableStateResponse<ISale[]> = {
			data: [],
			total: 0,
		};

		response.total = await this._saleModel.countDocuments(filter);
		response.data = await this._saleModel.find(
			filter,
			null,
			queryOptions<ISale>(tableState),
		);

		return response;
	}

	public async createManual(createSaleDto: CreateSaleDto): Promise<ISale> {
		try {
			if (!createSaleDto.createdByUserId) {
				throw new BadRequestException('Create user required!');
			}

			const saleNumber: string = `${Date.now()}`;

			const saleStores: ISaleStore[] =
				await this._processSaleStoresDtoToSaleStores(createSaleDto, saleNumber);

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
			};

			const saleModel = new this._saleModel(saleToCreate);

			const newSale: ISale = await saleModel.save();

			return newSale;
		} catch (error: any) {
			this._logger.error(error);

			throw new BadRequestException(error);
		}
	}

	// #endregion

	// #region Private Methods

	private async _processSaleStoresDtoToSaleStores(
		createSaleDto: CreateSaleDto,
		saleNumber: string,
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

		const storeIds: string[] = map(createSaleDto.stores, 'storeId');

		const stores: IStore[] = await this._storesService.findByIds(storeIds);

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
						addresses: [createSaleDto.buyer.address],
						birthDate: createSaleDto.buyer.birthDate,
						email: createSaleDto.buyer.email,
						gender: createSaleDto.buyer.gender,
						name: createSaleDto.buyer.name,
						phoneNumbers: [createSaleDto.buyer.phoneNumber],
						userId: buyerUserId,
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
		saleNumber: string,
	): ISaleStore[] {
		return saleStoreDto.map(
			(saleStoreDto: SaleStoreDto): ISaleStore => ({
				customerId: saleStoreDto.customerId as any,
				number: saleNumber,
				storeId: saleStoreDto.storeId as any,
				products: saleStoreDto.products,
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

	// #endregion
}

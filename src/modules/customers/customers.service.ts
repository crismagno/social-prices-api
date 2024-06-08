import { ManagedUpload } from 'aws-sdk/clients/s3';
import { AnyKeys, AnyObject, FilterQuery, Model } from 'mongoose';

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { schemasName } from '../../infra/database/mongo/schemas';
import { AmazonFilesService } from '../../infra/services/amazon/amazon-files-service';
import { queryOptions } from '../../shared/utils/table/table-state';
import {
	ITableStateRequest,
	ITableStateResponse,
} from '../../shared/utils/table/table-state.interface';
import { NotificationsService } from '../notifications/notifications.service';
import { IUser } from '../users/interfaces/user.interface';
import UsersEnum from '../users/interfaces/users.enum';
import { UsersService } from '../users/users.service';
import { ICustomer } from './interfaces/customer.interface';
import { Customer } from './interfaces/customer.schema';
import { IFindByOwnerUserIdAndPropertiesParams } from './interfaces/customers.type';
import CreateCustomerDto from './interfaces/dto/createCustomer.dto';
import UpdateCustomerDto from './interfaces/dto/updateCustomer.dto';

@Injectable()
export class CustomersService {
	// #region Private Properties

	private readonly _logger: Logger;

	// #endregion

	// #region Constructor

	constructor(
		@InjectModel(schemasName.customer)
		private readonly _customerModel: Model<Customer>,
		private readonly _usersService: UsersService,
		private readonly _amazonFilesService: AmazonFilesService,
		private readonly _notificationsService: NotificationsService,
	) {
		this._logger = new Logger(CustomersService.name);
	}

	// #endregion

	// #region Public Methods

	public async findById(customerId: string): Promise<ICustomer | undefined> {
		return this._customerModel.findById(customerId);
	}

	public async countByOwnerUserId(ownerUserId: string): Promise<number> {
		return this._customerModel.countDocuments({ ownerUserId });
	}

	public async findByIdOrFail(customerId: string): Promise<ICustomer> {
		const customer: ICustomer | undefined = await this.findById(customerId);

		if (!customer) {
			throw new NotFoundException('Customer not found!');
		}

		return customer;
	}

	public async findByOwnerUserId(ownerUserId: string): Promise<ICustomer[]> {
		const customers: ICustomer[] = await this._customerModel.find({
			ownerUserId,
		});

		return customers;
	}

	public async findByOwnerUserIdAndUserId(
		ownerUserId: string,
		userId: string,
	): Promise<ICustomer> {
		const customers: ICustomer = await this._customerModel.findOne({
			ownerUserId,
			userId,
		});

		return customers;
	}

	public async findByOwnerUserIdAndProperties({
		email,
		name,
		ownerUserId,
	}: IFindByOwnerUserIdAndPropertiesParams): Promise<ICustomer> {
		const customers: ICustomer = await this._customerModel.findOne({
			ownerUserId,
			email,
			name,
		});

		return customers;
	}

	public async findByOwnerUserTableState(
		ownerUserId: string,
		tableState: ITableStateRequest<ICustomer>,
	): Promise<ITableStateResponse<ICustomer[]>> {
		const filter: FilterQuery<ICustomer> = {
			ownerUserId,
		};

		if (tableState.search) {
			const search = new RegExp(tableState.search, 'ig');

			filter.$or = [
				{
					name: search,
				},
				{
					email: search,
				},
			];
		}

		if (tableState?.filters?.gender) {
			filter.gender = { $in: tableState.filters.gender as UsersEnum.Gender[] };
		}

		const response: ITableStateResponse<ICustomer[]> = {
			data: [],
			total: 0,
		};

		response.total = await this._customerModel.countDocuments(filter);
		response.data = await this._customerModel.find(
			filter,
			null,
			queryOptions<ICustomer>(tableState),
		);

		return response;
	}

	public async create(
		file: Express.Multer.File | null,
		createCustomerDto: CreateCustomerDto,
		ownerUserId: string,
	): Promise<ICustomer> {
		const user: IUser =
			await this._usersService.findOneByUserIdOrFail(ownerUserId);

		let responseFile: ManagedUpload.SendData | null = null;

		if (file) {
			responseFile = await this._amazonFilesService.uploadFile(file);
		}

		if (typeof createCustomerDto.addresses === 'string') {
			createCustomerDto.addresses = JSON.parse(createCustomerDto.addresses);
		}

		if (typeof createCustomerDto.phoneNumbers === 'string') {
			createCustomerDto.phoneNumbers = JSON.parse(
				createCustomerDto.phoneNumbers,
			);
		}

		const now: Date = new Date();

		const customer = new this._customerModel({
			avatar: responseFile?.Key ?? null,
			name: createCustomerDto.name,
			email: createCustomerDto.email,
			birthDate: createCustomerDto.birthDate,
			addresses: createCustomerDto.addresses,
			gender: createCustomerDto.gender,
			about: createCustomerDto.about,
			phoneNumbers: createCustomerDto.phoneNumbers,
			ownerUserId,
			createdAt: now,
			updatedAt: now,
			userId: createCustomerDto.userId,
		});

		const newCustomer: ICustomer = await customer.save();

		await this._notificationsService.createdCustomer(user, newCustomer);

		return newCustomer;
	}

	public async update(
		file: Express.Multer.File,
		updateCustomerDto: UpdateCustomerDto,
		userId: string,
	): Promise<ICustomer> {
		const user: IUser = await this._usersService.findOneByUserIdOrFail(userId);

		const customer: ICustomer = await this.findByIdOrFail(
			updateCustomerDto.customerId,
		);

		if (typeof updateCustomerDto.addresses === 'string') {
			updateCustomerDto.addresses = JSON.parse(updateCustomerDto.addresses);
		}

		if (typeof updateCustomerDto.phoneNumbers === 'string') {
			updateCustomerDto.phoneNumbers = JSON.parse(
				updateCustomerDto.phoneNumbers,
			);
		}

		const now: Date = new Date();

		const $set: AnyKeys<Customer> & AnyObject = {
			name: updateCustomerDto.name,
			email: updateCustomerDto.email,
			birthDate: updateCustomerDto.birthDate,
			addresses: updateCustomerDto.addresses,
			gender: updateCustomerDto.gender,
			about: updateCustomerDto.about,
			phoneNumbers: updateCustomerDto.phoneNumbers,
			updatedAt: now,
		};

		let responseFile: ManagedUpload.SendData | null = null;

		if (file) {
			responseFile = await this._amazonFilesService.uploadFile(file);

			$set.avatar = responseFile.Key;

			if (customer.avatar) {
				await this._amazonFilesService.deleteFile(customer.avatar);
			}
		}

		const customerUpdated: ICustomer =
			await this._customerModel.findByIdAndUpdate(customer._id, { $set });

		await this._notificationsService.updatedCustomer(user, customerUpdated);

		return customerUpdated;
	}

	// #endregion
}

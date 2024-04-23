import { ManagedUpload } from 'aws-sdk/clients/s3';
import { AnyKeys, AnyObject, FilterQuery, Model } from 'mongoose';

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
import { ICustomer } from './interfaces/customer.interface';
import { Customer } from './interfaces/customer.schema';
import CreateProductDto from './interfaces/dto/createCustomer.dto';
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
	) {
		this._logger = new Logger(CustomersService.name);
	}

	// #endregion

	// #region Public Methods

	public async findById(customerId: string): Promise<ICustomer | undefined> {
		return this._customerModel.findById(customerId);
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
					firstName: search,
				},
				{
					lastName: search,
				},
				{
					email: search,
				},
			];
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
		createProductDto: CreateProductDto,
		ownerUserId: string,
	): Promise<ICustomer> {
		await this._usersService.findOneByUserIdOrFail(ownerUserId);

		let responseFile: ManagedUpload.SendData | null = null;

		if (file) {
			responseFile = await this._amazonFilesService.uploadFile(file);
		}

		if (typeof createProductDto.addresses === 'string') {
			createProductDto.addresses = JSON.parse(createProductDto.addresses);
		}

		if (typeof createProductDto.phoneNumbers === 'string') {
			createProductDto.phoneNumbers = JSON.parse(createProductDto.phoneNumbers);
		}

		const now: Date = new Date();

		const product = new this._customerModel({
			avatar: responseFile.Key,
			firstName: createProductDto.firstName,
			middleName: createProductDto.middleName,
			lastName: createProductDto.lastName,
			email: createProductDto.email,
			birthDate: createProductDto.birthDate,
			addresses: createProductDto.addresses,
			gender: createProductDto.gender,
			about: createProductDto.about,
			phoneNumbers: createProductDto.phoneNumbers,
			ownerUserId,
			createdAt: now,
			updatedAt: now,
		});

		const newCustomer: ICustomer = await product.save();

		return newCustomer;
	}

	public async update(
		file: Express.Multer.File,
		updateCustomerDto: UpdateCustomerDto,
		userId: string,
	): Promise<ICustomer> {
		await this._usersService.findOneByUserIdOrFail(userId);

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
			firstName: updateCustomerDto.firstName,
			middleName: updateCustomerDto.middleName,
			lastName: updateCustomerDto.lastName,
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

		const customerUpdated = await this._customerModel.findByIdAndUpdate(
			customer._id,
			{ $set },
		);

		return customerUpdated;
	}

	// #endregion
}

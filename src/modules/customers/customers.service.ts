import { ManagedUpload } from 'aws-sdk/clients/s3';
import { includes, isNil } from 'lodash';
import { AnyKeys, AnyObject, FilterQuery, Model } from 'mongoose';
import * as xlsx from 'xlsx';

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { schemasName } from '../../infra/database/mongo/schemas';
import { FilesService } from '../../infra/services/files/files-service';
import PersonEnum from '../../shared/enums/person.enum';
import { parseToDate } from '../../shared/utils/dates/dates.utils';
import { isValidEmail } from '../../shared/utils/global/global';
import { queryOptions } from '../../shared/utils/table/table-state';
import {
	ITableStateRequest,
	ITableStateResponse,
} from '../../shared/utils/table/table-state.interface';
import { NotificationsService } from '../notifications/notifications.service';
import { IUser } from '../users/interfaces/user.interface';
import { UsersService } from '../users/users.service';
import { ICustomer } from './interfaces/customer.interface';
import { Customer } from './interfaces/customer.schema';
import {
	ICustomerUploadTemplateFileError,
	ICustomerUploadTemplateRow,
	ICustomerUploadTemplateRowError,
	IFindByOwnerUserIdAndPropertiesParams,
} from './interfaces/customers.type';
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
		private readonly _filesService: FilesService,
		private readonly _notificationsService: NotificationsService,
	) {
		this._logger = new Logger(CustomersService.name);
	}

	// #endregion

	// #region Public Methods

	public async findById(customerId: string): Promise<ICustomer | null> {
		return this._customerModel.findById(customerId);
	}

	public async countByOwnerUserId(ownerUserId: string): Promise<number> {
		return this._customerModel.countDocuments({ ownerUserId });
	}

	public async findByIdOrFail(customerId: string): Promise<ICustomer> {
		const customer: ICustomer | null = await this.findById(customerId);

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

	public async findByIds(customerIds: string[]): Promise<ICustomer[]> {
		const customers: ICustomer[] = await this._customerModel.find({
			_id: { $in: customerIds },
		});

		return customers;
	}

	public async findByOwnerUserIdAndUserId(
		ownerUserId: string,
		userId: string,
	): Promise<ICustomer> {
		const customer: ICustomer = await this._customerModel.findOne({
			ownerUserId,
			userId,
		});

		return customer;
	}

	public async findByOwnerUserIdAndProperties({
		email,
		name,
		ownerUserId,
	}: IFindByOwnerUserIdAndPropertiesParams): Promise<ICustomer> {
		const customer: ICustomer = await this._customerModel.findOne({
			ownerUserId,
			email,
			name,
		});

		return customer;
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
			filter.gender = { $in: tableState.filters.gender as PersonEnum.Gender[] };
		}

		if (tableState?.filters?.tagsIds?.length) {
			filter.tagsIds = { $in: tableState.filters.tagsIds };
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
		const user: IUser = await this._usersService.findOneByIdOrFail(ownerUserId);

		let responseFile: ManagedUpload.SendData | null = null;

		if (file) {
			responseFile = await this._filesService.uploadFile(file);
		}

		if (typeof createCustomerDto.addresses === 'string') {
			createCustomerDto.addresses = JSON.parse(createCustomerDto.addresses);
		}

		if (typeof createCustomerDto.phoneNumbers === 'string') {
			createCustomerDto.phoneNumbers = JSON.parse(
				createCustomerDto.phoneNumbers,
			);
		}

		if (typeof createCustomerDto.tagsIds === 'string') {
			createCustomerDto.tagsIds = JSON.parse(createCustomerDto.tagsIds);
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
			tagsIds: createCustomerDto.tagsIds,
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
		const user: IUser = await this._usersService.findOneByIdOrFail(userId);

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

		if (typeof updateCustomerDto.tagsIds === 'string') {
			updateCustomerDto.tagsIds = JSON.parse(updateCustomerDto.tagsIds);
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
			tagsIds: updateCustomerDto.tagsIds,
			updatedAt: now,
		};

		let responseFile: ManagedUpload.SendData | null = null;

		if (file) {
			responseFile = await this._filesService.uploadFile(file);

			$set.avatar = responseFile.Key;

			if (customer.avatar) {
				await this._filesService.deleteFile(customer.avatar);
			}
		}

		const customerUpdated: ICustomer =
			await this._customerModel.findByIdAndUpdate(customer._id, { $set });

		await this._notificationsService.updatedCustomer(user, customerUpdated);

		return customerUpdated;
	}

	public async uploadCustomers(
		files: Express.Multer.File[],
		userId: string,
		employeeId: string,
	): Promise<void> {
		// Validar se tem arquivo processando ou a ser processado e somente passar pra processar se ja tiver nenhum
		// e tbm criar a tabela de salvar os dados processados dos uploads
		// a ideia vai ser todos os patients que passar e for ok serao criados, os que derem erro serao informados do erro
		// lembrar de quebrar o metodo em pedacos e criar o service de validation

		this._filesService
			.getUploadFilesUrl(files)
			.then(async (filesUrl: string[]) => {
				const customerUploadTemplateFileErrors: ICustomerUploadTemplateFileError[] =
					[];

				for await (const [index, fileUrl] of filesUrl.entries()) {
					const customerUploadTemplateFileError: ICustomerUploadTemplateFileError =
						{
							filename: fileUrl,
							fileNumber: index + 1,
							rowsError: [],
						};

					try {
						const fileBuffer: Buffer | null =
							await this._filesService.getFileBufferByFilename(fileUrl);

						if (!fileBuffer) {
							this._logger.error('File Error, no data in file: ', fileUrl);
							continue;
						}

						const workbook: xlsx.WorkBook = xlsx.read(fileBuffer, {
							type: 'buffer',
						});

						const sheetName: string = workbook.SheetNames[0];
						const worksheet: xlsx.WorkSheet = workbook.Sheets[sheetName];

						const rows: ICustomerUploadTemplateRow[] =
							xlsx.utils.sheet_to_json<ICustomerUploadTemplateRow>(worksheet);

						for await (const [index, row] of rows.entries()) {
							const rowError: ICustomerUploadTemplateRowError = {
								rowNumber: index + 1,
								reasons: [],
							};

							const name: string = row['Name *']?.trim();
							const email: string = row['Email']?.trim();
							const birthDate: string = row['Birth Date']?.trim();
							const gender: string = row['Gender']?.trim();

							if (isNil(name) || !name) {
								rowError.reasons.push({
									message: 'Name is a required!',
									property: 'Name *',
								});
							}

							if (email && !isValidEmail(email)) {
								rowError.reasons.push({
									message: 'Invalid email!',
									property: 'Email',
								});
							}

							if (birthDate && !parseToDate(birthDate)) {
								rowError.reasons.push({
									message: 'Invalid Birth Date!',
									property: 'Birth Date',
								});
							}

							if (gender && !includes(PersonEnum.genderPascalList, gender)) {
								rowError.reasons.push({
									message: 'Invalid Gender!',
									property: 'Gender',
								});
							}

							if (rowError.reasons.length > 0) {
								customerUploadTemplateFileError.rowsError.push(rowError);
							}
						}
					} catch (error: any) {
						console.log(error);
						customerUploadTemplateFileError.processError =
							'Error when attempt read customers upload file!';

						this._logger.error(
							'Error when attempt read customers upload file!',
						);
					} finally {
						await this._filesService.deleteFile(fileUrl);
					}

					if (
						customerUploadTemplateFileError.rowsError.length > 0 ||
						customerUploadTemplateFileError.processError
					) {
						customerUploadTemplateFileErrors.push(
							customerUploadTemplateFileError,
						);
					}
				}

				console.log(JSON.stringify(customerUploadTemplateFileErrors));

				if (customerUploadTemplateFileErrors.length > 0) {
					// processar dados syncrono e no final mandar via socket uma resposta ao usuario que fez o upload, e mandar uma notificacao dos errors ou email ou via notification
				}
			})
			.catch((error: any) => {
				this._logger.error(error);
				throw new Error('Error when attempt process customers upload.');
			});
	}

	// #endregion
}

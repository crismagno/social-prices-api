import { ManagedUpload } from 'aws-sdk/clients/s3';
import * as ExcelJS from 'exceljs';
import { find, includes, some } from 'lodash';
import { AnyKeys, AnyObject, FilterQuery, Model, Types } from 'mongoose';

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { schemasName } from '../../infra/database/mongo/schemas';
import AddressEnum from '../../shared/enums/address.enum';
import PersonEnum from '../../shared/enums/person.enum';
import PhoneNumberEnum from '../../shared/enums/phone-number.enum';
import { IAddress } from '../../shared/interfaces/address.interface';
import { IPhoneNumber } from '../../shared/interfaces/phone-number.interface';
import { parseToDate } from '../../shared/utils/dates/dates.utils';
import { isValidEmail } from '../../shared/utils/global/global';
// import statesMockData from '../../shared/utils/mock-data/brazil-states.json';
// import countriesMockData from '../../shared/utils/mock-data/countries.json';
import {
	ICountryMockData,
	IStateMockData,
} from '../../shared/utils/mock-data/interfaces';
import {
	arrayObjectIdToString,
	arrayStringToObjectId,
} from '../../shared/utils/strings/strings';
import { queryOptions } from '../../shared/utils/table/table-state';
import {
	ITableStateRequest,
	ITableStateResponse,
} from '../../shared/utils/table/table-state.interface';
import { FilesService } from '../files/files-service';
import { NotificationsService } from '../notifications/notifications.service';
import { SocketsGateway } from '../sockets/sockets.gateway';
import TagsEnum from '../tags/interfaces/tags.enum';
import { ITag } from '../tags/interfaces/tags.interface';
import { TagsService } from '../tags/tags.service';
import { IUser } from '../users/interfaces/user.interface';
import { UsersService } from '../users/users.service';
import { CustomersValidationService } from './customers-validation.service';
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

export const countries: ICountryMockData[] = [];

export const states: IStateMockData[] = [];

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
		private readonly _customersValidationService: CustomersValidationService,
		private readonly _tagsService: TagsService,
		private readonly _socketsGateway: SocketsGateway,
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

	public async findByMainPropertiesAndOwnerUserId(
		name: string,
		email: string,
		birthDate: Date,
		ownerUserId: string,
	): Promise<ICustomer | null> {
		return this._customerModel.findOne({ name, ownerUserId, email, birthDate });
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

		const tags: ITag[] = await this._tagsService.findByType(
			userId,
			TagsEnum.Type.CUSTOMER,
		);

		const now: Date = new Date();

		this._filesService
			.getUploadFilesUrl(files)
			.then(async (filenames: string[]) => {
				const customerUploadTemplateFileErrors: ICustomerUploadTemplateFileError[] =
					[];

				for await (const [index, filename] of filenames.entries()) {
					const customerUploadTemplateFileError: ICustomerUploadTemplateFileError =
						{
							filename,
							fileNumber: index + 1,
							rowsError: [],
							processError: undefined,
						};

					try {
						const customerUploadTemplateRows: ICustomerUploadTemplateRow[] =
							await this._getCustomerUploadTemplateRowsByFilename(filename);

						customerUploadTemplateFileError.rowsError =
							await this._processCustomerUploadTemplateRows(
								customerUploadTemplateRows,
								userId,
								tags,
								now,
							);
					} catch (error: any) {
						customerUploadTemplateFileError.processError = error?.message;
						this._logger.error(error);
					} finally {
						await this._filesService.deleteFile(filename);
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

				this._socketsGateway.handleUploadCustomersResponseToEmployee(
					customerUploadTemplateFileErrors,
					employeeId,
				);
			})
			.catch((error: any) => {
				this._logger.error(error);
				throw new Error('Error when attempt process customers upload.');
			});
	}

	// #endregion

	// #region Private Methods

	public async _getCustomerUploadTemplateRowsByFilename(
		filename: string,
	): Promise<ICustomerUploadTemplateRow[]> {
		const fileBuffer: Buffer | null =
			await this._filesService.getFileBufferByFilename(filename);

		if (!fileBuffer) {
			throw new Error(`File Error, no data in file: ${filename}`);
		}

		const workbook: ExcelJS.Workbook = new ExcelJS.Workbook();
		await workbook.xlsx.load(fileBuffer);

		const worksheet = workbook.getWorksheet('Template');

		this._customersValidationService.validateCustomersUploadTemplate(
			worksheet.getRow(1),
		);

		const worksheetRowsCountToIterate: number = worksheet.rowCount + 1;

		const customerUploadTemplateRows: ICustomerUploadTemplateRow[] = [];

		for (
			let rowNumber = 2;
			rowNumber < worksheetRowsCountToIterate;
			rowNumber++
		) {
			if (worksheetRowsCountToIterate === rowNumber) {
				break;
			}

			const row: ExcelJS.Row = worksheet.getRow(rowNumber);

			const name: string = row.getCell('A')?.text?.trim();
			const email: string = row.getCell('B')?.text?.trim();
			const birthDate: string = row.getCell('C')?.text?.trim();
			const gender: string = row.getCell('D')?.text?.trim();
			const tags: string = row.getCell('E')?.text?.trim();
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

			customerUploadTemplateRows.push({
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
			});
		}

		return customerUploadTemplateRows;
	}

	public async _processCustomerUploadTemplateRows(
		customerUploadTemplateRows: ICustomerUploadTemplateRow[],
		ownerUserId: string,
		tags: ITag[],
		now: Date,
	): Promise<ICustomerUploadTemplateRowError[]> {
		const customersToCreate: ICustomer[] = [];

		const customerUploadTemplateRowsError: ICustomerUploadTemplateRowError[] =
			[];

		for await (const [
			index,
			customerUploadTemplateRow,
		] of customerUploadTemplateRows.entries()) {
			const customerUploadTemplateRowError: ICustomerUploadTemplateRowError = {
				rowNumber: index + 1,
				reasons: [],
			};

			try {
				if (!customerUploadTemplateRow.name?.trim()) {
					customerUploadTemplateRowError.reasons.push({
						message: 'Name is required!',
						property: 'name',
					});
				}

				if (
					customerUploadTemplateRow.email &&
					!isValidEmail(customerUploadTemplateRow.email)
				) {
					customerUploadTemplateRowError.reasons.push({
						message: 'Email invalid format!',
						property: 'email',
					});
				}

				const birthDate: Date | null = customerUploadTemplateRow.birthDate
					? parseToDate(customerUploadTemplateRow.birthDate)
					: null;

				if (customerUploadTemplateRow.birthDate) {
					if (!birthDate) {
						customerUploadTemplateRowError.reasons.push({
							message: 'Birth Date invalid format!',
							property: 'birthDate',
						});
					}
				}

				if (
					customerUploadTemplateRow.gender &&
					!includes(
						Object.keys(PersonEnum.Gender),
						customerUploadTemplateRow.gender.toUpperCase(),
					)
				) {
					customerUploadTemplateRowError.reasons.push({
						message: 'Gender invalid!',
						property: 'gender',
					});
				}

				if (
					customerUploadTemplateRow.address1 ||
					customerUploadTemplateRow.country ||
					customerUploadTemplateRow.state ||
					customerUploadTemplateRow.city ||
					customerUploadTemplateRow.zipCode ||
					customerUploadTemplateRow.district
				) {
					if (!customerUploadTemplateRow.address1?.trim()) {
						customerUploadTemplateRowError.reasons.push({
							message: 'Address1 invalid!',
							property: 'address1',
						});
					}

					if (!customerUploadTemplateRow.country?.trim()) {
						customerUploadTemplateRowError.reasons.push({
							message: 'Country invalid!',
							property: 'country',
						});
					}

					if (!customerUploadTemplateRow.state?.trim()) {
						customerUploadTemplateRowError.reasons.push({
							message: 'State invalid!',
							property: 'state',
						});
					}

					if (!customerUploadTemplateRow.city?.trim()) {
						customerUploadTemplateRowError.reasons.push({
							message: 'City invalid!',
							property: 'city',
						});
					}

					if (!customerUploadTemplateRow.zipCode) {
						customerUploadTemplateRowError.reasons.push({
							message: 'Zip Code invalid!',
							property: 'zipCode',
						});
					}

					if (!customerUploadTemplateRow.district?.trim()) {
						customerUploadTemplateRowError.reasons.push({
							message: 'District invalid!',
							property: 'district',
						});
					}
				}

				if (customerUploadTemplateRowError.reasons.length > 0) {
					customerUploadTemplateRowsError.push(customerUploadTemplateRowError);
					continue;
				}

				const customerToUpdate: ICustomer | null =
					customerUploadTemplateRow.email && birthDate
						? await this.findByMainPropertiesAndOwnerUserId(
								customerUploadTemplateRow.name,
								customerUploadTemplateRow.email,
								birthDate,
								ownerUserId,
						  )
						: null;

				const tagsByCustomerUploadTemplateRow: string[] =
					await this._getTagsByCustomerUploadTemplateRow(
						customerUploadTemplateRow.tags,
						ownerUserId,
						tags,
						arrayObjectIdToString(customerToUpdate?.tagsIds as any[]),
					);

				const tagsIds: Types.ObjectId[] = arrayStringToObjectId(
					tagsByCustomerUploadTemplateRow,
				);

				const phoneNumbers: IPhoneNumber[] =
					this._getPhoneNumbersByCustomerUploadTemplateRow(
						customerUploadTemplateRow,
						customerToUpdate?.phoneNumbers,
					);

				const addresses: IAddress[] =
					this._getAddressesByCustomerUploadTemplateRow(
						customerUploadTemplateRow,
						customerToUpdate?.addresses,
					);

				if (customerToUpdate) {
					customerToUpdate.gender = customerUploadTemplateRow.gender
						? (customerUploadTemplateRow.gender.toUpperCase() as PersonEnum.Gender)
						: customerToUpdate.gender;
					customerToUpdate.tagsIds = tagsIds as any[];
					customerToUpdate.about =
						customerUploadTemplateRow.about ?? customerToUpdate.about;
					customerToUpdate.phoneNumbers = phoneNumbers;
					customerToUpdate.addresses = addresses;

					await this._customerModel.updateOne(
						{
							_id: new Types.ObjectId(customerToUpdate._id),
						},
						{
							$set: customerToUpdate,
						},
					);
				} else {
					customersToCreate.push({
						avatar: null,
						name: customerUploadTemplateRow.name,
						email: customerUploadTemplateRow.email,
						birthDate: birthDate,
						addresses,
						gender: customerUploadTemplateRow.gender
							? (customerUploadTemplateRow.gender.toUpperCase() as PersonEnum.Gender)
							: PersonEnum.Gender.OTHER,
						about: customerUploadTemplateRow.about,
						phoneNumbers,
						tagsIds: tagsIds as any[],
						ownerUserId: ownerUserId as any,
						createdAt: now,
						updatedAt: now,
						userId: null,
						_id: null,
					});
				}
			} catch (error) {
				customerUploadTemplateRowError.reasons.push({
					message: 'Error when attempt process row',
					property: 'other',
				});

				customerUploadTemplateRowsError.push(customerUploadTemplateRowError);
			}
		}

		if (customersToCreate.length > 0) {
			await this._customerModel.create(customersToCreate);
		}

		return customerUploadTemplateRowsError;
	}

	public async _getTagsByCustomerUploadTemplateRow(
		tagsFromRow: string,
		userId: string,
		tagsFromUser: ITag[] = [],
		tagsIdsFromCustomer: string[] = [],
	): Promise<string[]> {
		if (!tagsFromRow?.trim()) {
			return tagsIdsFromCustomer;
		}

		for await (const tagFromRow of tagsFromRow.split(',')) {
			try {
				const tagFromUser: ITag | null = find(tagsFromUser, {
					name: tagFromRow,
				});

				if (tagFromUser) {
					const tagIdFromUser: string = tagFromUser._id.toString();
					if (!includes(tagsIdsFromCustomer, tagIdFromUser)) {
						tagsIdsFromCustomer.push(tagIdFromUser);
					}
				} else {
					const tagCreated: ITag = await this._tagsService.create({
						color: TagsEnum.tagDefaultColor,
						description: null,
						name: tagFromRow,
						type: TagsEnum.Type.CUSTOMER,
						userId,
					});

					tagsFromUser.push(tagCreated);
					tagsIdsFromCustomer.push(tagCreated._id);
				}
			} catch (error) {
				this._logger.error(error);
			}
		}

		return tagsIdsFromCustomer;
	}

	public _getPhoneNumbersByCustomerUploadTemplateRow(
		customerUploadTemplateRow: ICustomerUploadTemplateRow,
		phoneNumbers: IPhoneNumber[] = [],
	): IPhoneNumber[] {
		const phoneNumber: string | null = customerUploadTemplateRow.phoneNumber
			? customerUploadTemplateRow.phoneNumber.toString()
			: null;

		let phoneType: string | null = customerUploadTemplateRow.phoneType
			? customerUploadTemplateRow.phoneType?.toUpperCase()
			: null;

		if (!phoneNumber) {
			return phoneNumbers;
		}

		phoneType = includes(Object.keys(PhoneNumberEnum.Type), phoneType)
			? phoneType
			: PhoneNumberEnum.Type.OTHER;

		if (some(phoneNumbers, { number: phoneNumber, type: phoneType })) {
			return phoneNumbers;
		}

		const messengers: PhoneNumberEnum.PhoneNumberMessenger[] = (
			customerUploadTemplateRow.phoneMessengers?.trim()
				? customerUploadTemplateRow.phoneMessengers
						.toUpperCase()
						.split(',')
						.filter((x) =>
							includes(Object.keys(PhoneNumberEnum.PhoneNumberMessenger), x),
						)
				: []
		) as PhoneNumberEnum.PhoneNumberMessenger[];

		phoneNumbers.push({
			messengers,
			number: phoneNumber,
			type: phoneType as PhoneNumberEnum.Type,
			uid: Date.now().toString(),
		});

		return phoneNumbers;
	}

	public _getAddressesByCustomerUploadTemplateRow(
		customerUploadTemplateRow: ICustomerUploadTemplateRow,
		addresses: IAddress[] = [],
	): IAddress[] {
		if (
			!(
				customerUploadTemplateRow.address1 ||
				customerUploadTemplateRow.country ||
				customerUploadTemplateRow.state ||
				customerUploadTemplateRow.city ||
				customerUploadTemplateRow.zipCode ||
				customerUploadTemplateRow.district
			)
		) {
			return addresses;
		}

		const country: ICountryMockData = find(
			countries,
			(country: ICountryMockData) =>
				country.code === customerUploadTemplateRow.country ||
				country.name === customerUploadTemplateRow.country,
		) ?? {
			code: customerUploadTemplateRow.country,
			name: customerUploadTemplateRow.country,
		};

		const state: IStateMockData = find(
			states,
			(state: IStateMockData) =>
				state.code === customerUploadTemplateRow.state ||
				state.name === customerUploadTemplateRow.state,
		) ?? {
			code: customerUploadTemplateRow.state,
			name: customerUploadTemplateRow.state,
		};

		const types: AddressEnum.Type[] = (
			customerUploadTemplateRow.addressTypes
				? customerUploadTemplateRow.addressTypes
						.toUpperCase()
						.split(',')
						.filter((x) => includes(Object.keys(AddressEnum.Type), x))
				: []
		) as AddressEnum.Type[];

		addresses.push({
			address1: customerUploadTemplateRow.address1,
			address2: customerUploadTemplateRow.address2,
			city: customerUploadTemplateRow.city,
			country,
			description: customerUploadTemplateRow.addressDescription,
			district: customerUploadTemplateRow.district,
			isValid: true,
			state,
			uid: Date.now().toString(),
			zip: customerUploadTemplateRow.zipCode.toString(),
			types,
		});

		return addresses;
	}

	// #endregion
}

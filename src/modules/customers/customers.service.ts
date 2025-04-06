import { ManagedUpload } from 'aws-sdk/clients/s3';
import * as ExcelJS from 'exceljs';
import { find, includes, some } from 'lodash';
import {
	AnyKeys,
	AnyObject,
	FilterQuery,
	Model,
	QueryOptions,
	Types,
	UpdateQuery,
} from 'mongoose';

import {
	Injectable,
	InternalServerErrorException,
	Logger,
	NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { schemasName } from '../../infra/database/mongo/schemas';
import AddressEnum from '../../shared/enums/address.enum';
import PersonEnum from '../../shared/enums/person.enum';
import PhoneNumberEnum from '../../shared/enums/phone-number.enum';
import { IAddress } from '../../shared/interfaces/address.interface';
import { IPhoneNumber } from '../../shared/interfaces/phone-number.interface';
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
	arrayObjectIdToString,
	arrayStringToObjectId,
	createAddressName,
	createPhoneNumberName,
} from '../../shared/utils/strings/strings';
import {
	queryOptions,
	queryOptionsBySort,
} from '../../shared/utils/table/table-state';
import {
	ITableStateRequest,
	ITableStateResponse,
} from '../../shared/utils/table/table-state.interface';
import { FilesUploadsService } from '../files-uploads/files-uploads.service';
import { IFileUpload } from '../files-uploads/interfaces/file-upload.interface';
import FilesUploadsEnum from '../files-uploads/interfaces/files-uploads.enum';
import {
	IFileUploadTemplateError,
	IFileUploadTemplateErrorRow,
} from '../files-uploads/interfaces/files-uploads.type';
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
	ICustomerFileUploadTemplateRow,
	IFiltersDownloadCustomers,
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
		private readonly _customersValidationService: CustomersValidationService,
		private readonly _tagsService: TagsService,
		private readonly _socketsGateway: SocketsGateway,
		private readonly _filesUploadsService: FilesUploadsService,
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

	public async findByOwnerUserIdAndUniqName(
		ownerUserId: string,
		uniqName: string,
	): Promise<ICustomer | undefined> {
		return this._customerModel.findOne({
			ownerUserId,
			uniqName,
		});
	}

	public async validateUniqName(
		ownerUserId: string,
		uniqName?: string,
		customerId?: string,
	): Promise<void> {
		if (!uniqName?.trim()) {
			return;
		}

		const customer: ICustomer = await this._customerModel.findOne({
			ownerUserId,
			uniqName,
		});

		if (customer && customer?._id.toString() !== customerId) {
			throw new InternalServerErrorException('Uniq Name already exist!');
		}
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
				{
					uniqName: search,
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

		await this.validateUniqName(ownerUserId, createCustomerDto.uniqName);

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
			uniqName:
				createCustomerDto.uniqName?.trim() ??
				createUsernameByName(createCustomerDto.name),
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

		await this.validateUniqName(
			userId,
			updateCustomerDto.uniqName,
			updateCustomerDto.customerId,
		);

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
			uniqName:
				updateCustomerDto.uniqName?.trim() ??
				createUsernameByName(updateCustomerDto.name),
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
		const hasUploadCustomersProcessing: boolean =
			await this._filesUploadsService.hasUploadCustomersProcessingByUserId(
				userId,
			);

		if (hasUploadCustomersProcessing) {
			throw new InternalServerErrorException(
				'In the moment you have upload customers files processing. please wait finish to try upload new files.',
			);
		}

		const tags: ITag[] = await this._tagsService.findByType(
			userId,
			TagsEnum.Type.CUSTOMER,
		);

		const now: Date = new Date();

		this._filesService
			.getUploadFilesUrl(files)
			.then(async (filenames: string[]) => {
				const filesUploads: IFileUpload[] =
					await this._filesUploadsService.createMulti({
						employeeId,
						filenames,
						type: FilesUploadsEnum.Type.UPLOAD_CUSTOMERS,
						userId,
					});

				const fileUploadTemplateErrors: IFileUploadTemplateError<ICustomerFileUploadTemplateRow>[] =
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

					const fileUploadTemplateError: IFileUploadTemplateError<ICustomerFileUploadTemplateRow> =
						{
							filename,
							fileNumber: index + 1,
							rowsError: [],
							processError: undefined,
							fileColumns: {
								rowNumber: 'Row Number',
								name: 'Name',
								email: 'Email',
								birthDate: 'Birth Date',
								gender: 'Gender',
								tags: 'Tags',
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
								other: 'Other',
							},
						};

					try {
						const customerFileUploadTemplateRows: ICustomerFileUploadTemplateRow[] =
							await this._getCustomerFileUploadTemplateRowsByFilename(filename);

						await this._filesUploadsService.findByIdAndUpdate(fileUploadId, {
							$set: {
								updatedAt: new Date(),
								totalToProcess: customerFileUploadTemplateRows.length,
							},
						});

						fileUploadTemplateError.rowsError =
							await this._processCustomerFileUploadTemplateRows(
								customerFileUploadTemplateRows,
								userId,
								tags,
								now,
							);

						await this._filesUploadsService.findByIdAndUpdate(fileUploadId, {
							$set: {
								updatedAt: new Date(),
								totalError: fileUploadTemplateError.rowsError.length,
								totalSuccess:
									customerFileUploadTemplateRows.length -
									fileUploadTemplateError.rowsError.length,
								totalProcessed: customerFileUploadTemplateRows.length,
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

					this._socketsGateway.handleResponseUploadCustomersFileToUser(userId);
				}

				this._socketsGateway.handleUploadCustomersResponseToEmployee(
					fileUploadTemplateErrors,
					employeeId,
				);
			})
			.catch((error: any) => {
				this._logger.error(error);
				throw new Error('Error when attempt process customers upload.');
			});
	}

	public async downloadCustomers(
		ownerUserId: string,
		filters: IFiltersDownloadCustomers,
	): Promise<Buffer> {
		const filter: FilterQuery<ICustomer> = {
			ownerUserId,
		};

		if (filters.search) {
			const search = new RegExp(filters.search, 'ig');

			filter.$or = [
				{
					name: search,
				},
				{
					email: search,
				},
			];
		}

		if (filters.gender) {
			filter.gender = { $in: filters.gender };
		}

		if (filters.tagsIds?.length) {
			filter.tagsIds = { $in: filters.tagsIds };
		}

		const customers: ICustomer[] = await this._customerModel.find(
			filter,
			null,
			queryOptionsBySort<ICustomer>({
				field: filters.sortField as any,
				order: filters.sortOrder,
			}),
		);

		const tags: ITag[] = await this._tagsService.findByType(
			ownerUserId,
			TagsEnum.Type.CUSTOMER,
		);

		const workbook: ExcelJS.Workbook = new ExcelJS.Workbook();
		const worksheet: ExcelJS.Worksheet = workbook.addWorksheet('Errors');

		const columns = {
			name: 'Name',
			email: 'Email',
			birthDate: 'Birth Date',
			gender: 'Gender',
			tags: 'Tags',
			about: 'About',
			addresses: 'Addresses',
			phones: 'Phones',
			createdAt: 'Created At',
			uniqName: 'Uniq Name',
		};

		const sheetColumns: any[] = [];

		for (const columnKey in columns) {
			sheetColumns.push({
				header: columns[columnKey],
				key: columnKey,
				width: columnKey === 'addresses' ? 50 : 30,
			});
		}

		worksheet.columns = sheetColumns;

		for (const customer of customers) {
			const tagsNames: string = customer.tagsIds.reduce(
				(acc: string, tagId, index: number) => {
					const tag = find(tags, { _id: tagId }) as ITag | undefined;

					const isLastIndex: boolean = customer.tagsIds.length - 1 === index;

					if (tag) {
						acc += `${tag.name}${isLastIndex ? '' : ', '}`;
					}

					return acc;
				},
				'',
			);

			const addresses: string = customer.addresses.reduce(
				(acc: string, address: IAddress, index: number) => {
					acc += `${index === 0 ? '' : '\n'}(${index + 1}) ${createAddressName(
						address,
					)}`;

					return acc;
				},
				'',
			);

			const phones: string = customer.phoneNumbers.reduce(
				(acc: string, phone: IPhoneNumber, index: number) => {
					acc += `${index === 0 ? '' : '\n'}(${
						index + 1
					}) ${createPhoneNumberName(phone)}`;

					return acc;
				},
				'',
			);

			worksheet.addRow({
				name: customer.name,
				email: customer.email,
				birthDate: customer.birthDate,
				gender: PersonEnum.GenderLabels[customer.gender],
				tags: tagsNames,
				about: customer.about,
				addresses: addresses,
				phones: phones,
				createdAt: customer.createdAt,
				uniqName: customer.uniqName,
			});
		}

		const buffer = await workbook.xlsx.writeBuffer();
		return buffer as Buffer;
	}

	public async findByIdAndUpdate(
		customerId: string,
		update?: UpdateQuery<ICustomer>,
		options?: QueryOptions<ICustomer>,
	): Promise<ICustomer> {
		return this._customerModel.findByIdAndUpdate(customerId, update, options);
	}

	public async insert(customer: ICustomer): Promise<ICustomer> {
		return this._customerModel.create(customer);
	}

	// #endregion

	// #region Private Methods

	private async _getCustomerFileUploadTemplateRowsByFilename(
		filename: string,
	): Promise<ICustomerFileUploadTemplateRow[]> {
		const fileBuffer: Buffer | null =
			await this._filesService.getFileBufferByFilename(filename);

		if (!fileBuffer) {
			throw new Error(`File Error, no data in file: ${filename}`);
		}

		const workbook: ExcelJS.Workbook = new ExcelJS.Workbook();
		await workbook.xlsx.load(fileBuffer);

		const worksheet: ExcelJS.Worksheet = workbook.getWorksheet('Template');

		this._customersValidationService.validateCustomersUploadTemplate(
			worksheet.getRow(1),
		);

		const worksheetRowsCountToIterate: number = worksheet.rowCount + 1;

		const customerFileUploadTemplateRows: ICustomerFileUploadTemplateRow[] = [];

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

			customerFileUploadTemplateRows.push({
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
			});
		}

		return customerFileUploadTemplateRows;
	}

	private async _processCustomerFileUploadTemplateRows(
		customerFileUploadTemplateRows: ICustomerFileUploadTemplateRow[],
		ownerUserId: string,
		tags: ITag[],
		now: Date,
	): Promise<IFileUploadTemplateErrorRow<ICustomerFileUploadTemplateRow>[]> {
		const customersToCreate: ICustomer[] = [];

		const fileUploadTemplateErrorRows: IFileUploadTemplateErrorRow<ICustomerFileUploadTemplateRow>[] =
			[];

		for await (const customerFileUploadTemplateRow of customerFileUploadTemplateRows) {
			const fileUploadTemplateErrorRow: IFileUploadTemplateErrorRow<ICustomerFileUploadTemplateRow> =
				{
					rowNumber: customerFileUploadTemplateRow.rowNumber,
					reasons: [],
				};

			try {
				if (!customerFileUploadTemplateRow.name?.trim()) {
					fileUploadTemplateErrorRow.reasons.push({
						message: 'Name is required!',
						property: 'name',
					});
				}

				if (
					customerFileUploadTemplateRow.email &&
					!isValidEmail(customerFileUploadTemplateRow.email)
				) {
					fileUploadTemplateErrorRow.reasons.push({
						message: 'Email invalid format!',
						property: 'email',
					});
				}

				const birthDate: Date | null = customerFileUploadTemplateRow.birthDate
					? parseToDate(customerFileUploadTemplateRow.birthDate)
					: null;

				if (customerFileUploadTemplateRow.birthDate) {
					if (!birthDate) {
						fileUploadTemplateErrorRow.reasons.push({
							message: 'Birth Date invalid format!',
							property: 'birthDate',
						});
					}
				}

				if (
					customerFileUploadTemplateRow.gender &&
					!includes(
						Object.keys(PersonEnum.Gender),
						customerFileUploadTemplateRow.gender.toUpperCase(),
					)
				) {
					fileUploadTemplateErrorRow.reasons.push({
						message: 'Gender invalid!',
						property: 'gender',
					});
				}

				if (
					customerFileUploadTemplateRow.address1 ||
					customerFileUploadTemplateRow.country ||
					customerFileUploadTemplateRow.state ||
					customerFileUploadTemplateRow.city ||
					customerFileUploadTemplateRow.zipCode ||
					customerFileUploadTemplateRow.district
				) {
					if (!customerFileUploadTemplateRow.address1?.trim()) {
						fileUploadTemplateErrorRow.reasons.push({
							message: 'Address1 invalid!',
							property: 'address1',
						});
					}

					if (!customerFileUploadTemplateRow.country?.trim()) {
						fileUploadTemplateErrorRow.reasons.push({
							message: 'Country invalid!',
							property: 'country',
						});
					}

					if (!customerFileUploadTemplateRow.state?.trim()) {
						fileUploadTemplateErrorRow.reasons.push({
							message: 'State invalid!',
							property: 'state',
						});
					}

					if (!customerFileUploadTemplateRow.city?.trim()) {
						fileUploadTemplateErrorRow.reasons.push({
							message: 'City invalid!',
							property: 'city',
						});
					}

					if (!customerFileUploadTemplateRow.zipCode) {
						fileUploadTemplateErrorRow.reasons.push({
							message: 'Zip Code invalid!',
							property: 'zipCode',
						});
					}

					if (!customerFileUploadTemplateRow.district?.trim()) {
						fileUploadTemplateErrorRow.reasons.push({
							message: 'District invalid!',
							property: 'district',
						});
					}
				}

				if (fileUploadTemplateErrorRow.reasons.length > 0) {
					fileUploadTemplateErrorRows.push(fileUploadTemplateErrorRow);
					continue;
				}

				const customerToUpdate: ICustomer | null =
					customerFileUploadTemplateRow.email && birthDate
						? await this.findByMainPropertiesAndOwnerUserId(
								customerFileUploadTemplateRow.name,
								customerFileUploadTemplateRow.email,
								birthDate,
								ownerUserId,
						  )
						: null;

				const tagsByCustomerUploadTemplateRow: string[] =
					await this._getTagsByCustomerFileUploadTemplateRow(
						customerFileUploadTemplateRow.tags,
						ownerUserId,
						tags,
						arrayObjectIdToString(customerToUpdate?.tagsIds as any[]),
					);

				const tagsIds: Types.ObjectId[] = arrayStringToObjectId(
					tagsByCustomerUploadTemplateRow,
				);

				const phoneNumbers: IPhoneNumber[] =
					this._getPhoneNumbersByCustomerFileUploadTemplateRow(
						customerFileUploadTemplateRow,
						customerToUpdate?.phoneNumbers,
					);

				const addresses: IAddress[] =
					this._getAddressesByCustomerFileUploadTemplateRow(
						customerFileUploadTemplateRow,
						customerToUpdate?.addresses,
					);

				if (customerToUpdate) {
					customerToUpdate.gender = customerFileUploadTemplateRow.gender
						? (customerFileUploadTemplateRow.gender.toUpperCase() as PersonEnum.Gender)
						: customerToUpdate.gender;
					customerToUpdate.tagsIds = tagsIds as any[];
					customerToUpdate.about =
						customerFileUploadTemplateRow.about ?? customerToUpdate.about;
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
						name: customerFileUploadTemplateRow.name,
						email: customerFileUploadTemplateRow.email,
						birthDate: birthDate,
						addresses,
						gender: customerFileUploadTemplateRow.gender
							? (customerFileUploadTemplateRow.gender.toUpperCase() as PersonEnum.Gender)
							: PersonEnum.Gender.OTHER,
						about: customerFileUploadTemplateRow.about,
						phoneNumbers,
						tagsIds: tagsIds as any[],
						ownerUserId: ownerUserId as any,
						createdAt: now,
						updatedAt: now,
						userId: null,
						_id: null,
						uniqName: createUsernameByName(customerFileUploadTemplateRow.name),
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

		if (customersToCreate.length > 0) {
			await this._customerModel.create(customersToCreate);
		}

		return fileUploadTemplateErrorRows;
	}

	private async _getTagsByCustomerFileUploadTemplateRow(
		tagsFromRow: string,
		userId: string,
		tagsFromUser: ITag[] = [],
		tagsIdsFromCustomer: string[] = [],
	): Promise<string[]> {
		if (!tagsFromRow?.trim()) {
			return tagsIdsFromCustomer;
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
			} catch (error: any) {
				this._logger.error(error);
			}
		}

		return tagsIdsFromCustomer;
	}

	private _getPhoneNumbersByCustomerFileUploadTemplateRow(
		customerFileUploadTemplateRow: ICustomerFileUploadTemplateRow,
		phoneNumbers: IPhoneNumber[] = [],
	): IPhoneNumber[] {
		const phoneNumber: string | null = customerFileUploadTemplateRow.phoneNumber
			? customerFileUploadTemplateRow.phoneNumber.toString().trim()
			: null;

		let phoneType: string | null = customerFileUploadTemplateRow.phoneType
			? customerFileUploadTemplateRow.phoneType?.toUpperCase().trim()
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
			customerFileUploadTemplateRow.phoneMessengers?.trim()
				? customerFileUploadTemplateRow.phoneMessengers
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

		phoneNumbers.push({
			messengers,
			number: phoneNumber,
			type: phoneType as PhoneNumberEnum.Type,
			uid: Date.now().toString(),
		});

		return phoneNumbers;
	}

	private _getAddressesByCustomerFileUploadTemplateRow(
		customerFileUploadTemplateRow: ICustomerFileUploadTemplateRow,
		addresses: IAddress[] = [],
	): IAddress[] {
		if (
			!(
				customerFileUploadTemplateRow.address1 ||
				customerFileUploadTemplateRow.country ||
				customerFileUploadTemplateRow.state ||
				customerFileUploadTemplateRow.city ||
				customerFileUploadTemplateRow.zipCode ||
				customerFileUploadTemplateRow.district
			)
		) {
			return addresses;
		}

		customerFileUploadTemplateRow.address1 =
			customerFileUploadTemplateRow.address1?.trim();
		customerFileUploadTemplateRow.country =
			customerFileUploadTemplateRow.country?.trim();
		customerFileUploadTemplateRow.state =
			customerFileUploadTemplateRow.state?.trim();
		customerFileUploadTemplateRow.city =
			customerFileUploadTemplateRow.city?.trim();
		customerFileUploadTemplateRow.zipCode =
			customerFileUploadTemplateRow.zipCode &&
			String(customerFileUploadTemplateRow.zipCode)?.trim();
		customerFileUploadTemplateRow.district =
			customerFileUploadTemplateRow.district?.trim();

		const country: ICountryMockData = find(
			countries,
			(country: ICountryMockData) =>
				country.code === customerFileUploadTemplateRow.country ||
				country.name === customerFileUploadTemplateRow.country,
		) ?? {
			code: customerFileUploadTemplateRow.country,
			name: customerFileUploadTemplateRow.country,
		};

		const state: IStateMockData = find(
			states,
			(state: IStateMockData) =>
				state.code === customerFileUploadTemplateRow.state ||
				state.name === customerFileUploadTemplateRow.state,
		) ?? {
			code: customerFileUploadTemplateRow.state,
			name: customerFileUploadTemplateRow.state,
		};

		const types: AddressEnum.Type[] = (
			customerFileUploadTemplateRow.addressTypes
				? customerFileUploadTemplateRow.addressTypes
						.toUpperCase()
						.split(',')
						.map((addressType: string) => addressType.trim())
						.filter((addressType: string) =>
							includes(Object.keys(AddressEnum.Type), addressType),
						)
				: []
		) as AddressEnum.Type[];

		addresses.push({
			address1: customerFileUploadTemplateRow.address1,
			address2: customerFileUploadTemplateRow.address2,
			city: customerFileUploadTemplateRow.city,
			country,
			description: customerFileUploadTemplateRow.addressDescription,
			district: customerFileUploadTemplateRow.district,
			isValid: true,
			state,
			uid: Date.now().toString(),
			zip: customerFileUploadTemplateRow.zipCode.toString(),
			types,
		});

		return addresses;
	}

	// #endregion
}

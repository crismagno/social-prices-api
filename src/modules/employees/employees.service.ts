import { ManagedUpload } from 'aws-sdk/clients/s3';
import * as ExcelJS from 'exceljs';
import { find, includes, some } from 'lodash';
import { AnyKeys, AnyObject, FilterQuery, Model, Types } from 'mongoose';

import {
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
import PersonEnum from '../../shared/common/person/person.enum';
import PhoneNumberEnum from '../../shared/common/phone/phone-number.enum';
import { IPhoneNumber } from '../../shared/common/phone/phone-number.interface';
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
import {
	IEmployeeFileUploadTemplateRow,
	IFiltersDownloadEmployees,
} from '../employees/interfaces/employees.types';
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
import { EmployeesValidationService } from './employees-validation.service';
import CreateEmployeeDto from './interfaces/dto/createEmployee.dto';
import UpdateEmployeeDto from './interfaces/dto/updateEmployee.dto';
import { IEmployee } from './interfaces/employee.interface';
import { Employee } from './interfaces/employee.schema';
import EmployeesEnum from './interfaces/employees.enum';
import { ISearchEmployee } from './interfaces/employees.types';

@Injectable()
export class EmployeesService {
	// #region Private Properties

	private readonly _logger: Logger;

	// #endregion

	// #region Constructor

	constructor(
		@InjectModel(schemasName.employee)
		private readonly _employeeModel: Model<Employee>,
		private readonly _filesService: FilesService,
		private readonly _notificationsService: NotificationsService,
		private readonly _hashCrypt: HashCrypt,
		private readonly _usersService: UsersService,
		private readonly _tagsService: TagsService,
		private readonly _socketsGateway: SocketsGateway,
		private readonly _filesUploadsService: FilesUploadsService,
		private readonly _employeesValidationService: EmployeesValidationService,
	) {
		this._logger = new Logger(EmployeesService.name);
	}

	// #endregion

	// #region Public Methods

	public async findById(employeeId: string): Promise<IEmployee | null> {
		return this._employeeModel.findById(employeeId);
	}

	public async countByUserId(userId: string): Promise<number> {
		return this._employeeModel.countDocuments({ userId });
	}

	public async findByIdOrFail(employeeId: string): Promise<IEmployee> {
		const employee: IEmployee | null = await this.findById(employeeId);

		if (!employee) {
			throw new NotFoundException('Employee not found!');
		}

		return employee;
	}

	public async findByUsernameOrFail(username: string): Promise<IEmployee> {
		const employee: IEmployee | null = await this._employeeModel.findOne({
			username,
		});

		if (!employee) {
			throw new NotFoundException('Employee not found!');
		}

		return employee;
	}

	public async findByUserId(userId: string): Promise<IEmployee[]> {
		return this._employeeModel.find({
			userId,
		});
	}

	public async validateCreateOrUpdate(
		userId: string,
		name: string,
		email: string,
		employeeId?: string,
	): Promise<void> {
		const employee: IEmployee | null = await this._employeeModel.findOne({
			userId,
			name,
			email,
		});

		if (!employee) return;

		if (employeeId && employeeId === employee._id.toString()) return;

		throw new Error(
			`Already exists a employee by same name and email in account!`,
		);
	}

	public async findByIds(employeeIds: string[]): Promise<IEmployee[]> {
		return this._employeeModel.find({
			_id: { $in: employeeIds },
		});
	}

	public async findByUserTableState(
		userId: string,
		employeeId: string,
		tableState: ITableStateRequest<IEmployee>,
	): Promise<ITableStateResponse<IEmployee[]>> {
		const employee: IEmployee = await this.findByIdOrFail(employeeId);

		if (employee.level === EmployeesEnum.Level.EMPLOYEE) {
			return {
				data: [],
				total: 0,
			};
		}

		const filter: FilterQuery<IEmployee> = {
			userId,
		};

		if (employee.level === EmployeesEnum.Level.MASTER) {
			filter.level = EmployeesEnum.Level.EMPLOYEE;
		}

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
					username: search,
				},
			];
		}

		if (tableState?.filters?.gender) {
			filter.gender = {
				$in: tableState.filters.gender as PersonEnum.Gender[],
			};
		}

		if (tableState?.filters?.tagsIds?.length) {
			filter.tagsIds = { $in: tableState.filters.tagsIds };
		}

		if (
			tableState?.filters?.level?.length &&
			employee.level === EmployeesEnum.Level.ADMIN
		) {
			filter.level = { $in: tableState.filters.level };
		}

		if (tableState?.filters?.status?.length) {
			filter.status = { $in: tableState.filters.status };
		}

		const response: ITableStateResponse<IEmployee[]> = {
			data: [],
			total: 0,
		};

		response.total = await this._employeeModel.countDocuments(filter);
		response.data = await this._employeeModel.find(
			filter,
			{ password: 0 },
			queryOptions<IEmployee>(tableState),
		);

		return response;
	}

	public async findByMainPropertiesAndUserId(
		name: string,
		email: string,
		birthDate: Date,
		userId: string,
	): Promise<IEmployee | null> {
		return this._employeeModel.findOne({ name, userId, email, birthDate });
	}

	public async create(
		file: Express.Multer.File | null,
		createEmployeeDto: CreateEmployeeDto,
		userId: string,
	): Promise<IEmployee> {
		await this.validateCreateOrUpdate(
			userId,
			createEmployeeDto.name,
			createEmployeeDto.email,
		);

		const user: IUser = await this._usersService.findOneByIdOrFail(userId);

		let responseFile: ManagedUpload.SendData | null = null;

		if (file) {
			responseFile = await this._filesService.uploadFile(file);
		}

		if (typeof createEmployeeDto.addresses === 'string') {
			createEmployeeDto.addresses = JSON.parse(createEmployeeDto.addresses);
		}

		if (typeof createEmployeeDto.phoneNumbers === 'string') {
			createEmployeeDto.phoneNumbers = JSON.parse(
				createEmployeeDto.phoneNumbers,
			);
		}

		if (typeof createEmployeeDto.tagsIds === 'string') {
			createEmployeeDto.tagsIds = JSON.parse(createEmployeeDto.tagsIds);
		}

		const now: Date = new Date();

		const hashPassword: string = await this._hashCrypt.generateHash(
			createEmployeeDto.password,
		);

		const employee = new this._employeeModel({
			userId,
			avatar: createEmployeeDto.avatar || responseFile?.Key || null,
			name: createEmployeeDto.name,
			username:
				createEmployeeDto.username ||
				createUsernameByName(createEmployeeDto.name),
			email: createEmployeeDto.email,
			password: hashPassword,
			birthDate: createEmployeeDto.birthDate,
			gender: createEmployeeDto.gender,
			addresses: createEmployeeDto.addresses,
			phoneNumbers: createEmployeeDto.phoneNumbers,
			tagsIds: createEmployeeDto.tagsIds,
			about: createEmployeeDto.about,
			level: createEmployeeDto.level,
			status: createEmployeeDto.status ?? EmployeesEnum.Status.PENDING,
			isMain: !!createEmployeeDto.isMain,
			createdAt: now,
			updatedAt: now,
			uploadFilename: null,
		});

		const newEmployee: IEmployee = await employee.save();

		await this._notificationsService.createdEmployee(
			user,
			newEmployee,
			createEmployeeDto.password,
		);

		return newEmployee;
	}

	public async update(
		file: Express.Multer.File,
		updateEmployeeDto: UpdateEmployeeDto,
	): Promise<IEmployee> {
		const employee: IEmployee = await this.findByIdOrFail(
			updateEmployeeDto.employeeId,
		);

		await this.validateCreateOrUpdate(
			employee.userId.toString(),
			updateEmployeeDto.name,
			updateEmployeeDto.email,
			updateEmployeeDto.employeeId,
		);

		const user: IUser = await this._usersService.findOneByIdOrFail(
			employee.userId.toString(),
		);

		if (typeof updateEmployeeDto.addresses === 'string') {
			updateEmployeeDto.addresses = JSON.parse(updateEmployeeDto.addresses);
		}

		if (typeof updateEmployeeDto.phoneNumbers === 'string') {
			updateEmployeeDto.phoneNumbers = JSON.parse(
				updateEmployeeDto.phoneNumbers,
			);
		}

		if (typeof updateEmployeeDto.tagsIds === 'string') {
			updateEmployeeDto.tagsIds = JSON.parse(updateEmployeeDto.tagsIds);
		}

		const now: Date = new Date();

		const $set: AnyKeys<Employee> & AnyObject = {
			name: updateEmployeeDto.name,
			email: updateEmployeeDto.email,
			birthDate: updateEmployeeDto.birthDate,
			addresses: updateEmployeeDto.addresses,
			gender: updateEmployeeDto.gender,
			about: updateEmployeeDto.about,
			phoneNumbers: updateEmployeeDto.phoneNumbers,
			tagsIds: updateEmployeeDto.tagsIds,
			level: updateEmployeeDto.level,
			updatedAt: now,
		};

		if (updateEmployeeDto.password) {
			const hashPassword: string = await this._hashCrypt.generateHash(
				updateEmployeeDto.password,
			);

			$set.password = hashPassword;
		}

		let responseFile: ManagedUpload.SendData | null = null;

		if (file) {
			responseFile = await this._filesService.uploadFile(file);

			$set.avatar = responseFile.Key;

			if (employee.avatar) {
				await this._filesService.deleteFile(employee.avatar);
			}
		}

		const employeeUpdated: IEmployee =
			await this._employeeModel.findByIdAndUpdate(employee._id, { $set });

		await this._notificationsService.updatedEmployee(user, employeeUpdated);

		return employeeUpdated;
	}

	public async activeAdminByUserId(userId: string): Promise<void> {
		await this._employeeModel.findOneAndUpdate(
			{
				userId,
				level: EmployeesEnum.Level.ADMIN,
				status: EmployeesEnum.Status.PENDING,
			},
			{
				$set: { status: EmployeesEnum.Status.ACTIVE },
			},
			{ new: true },
		);
	}

	public async findAdminByUserId(userId: string): Promise<IEmployee> {
		const employee: IEmployee | null = await this._employeeModel.findOne({
			userId,
			level: EmployeesEnum.Level.ADMIN,
		});

		if (!employee) {
			throw new NotFoundException('Employee not found!');
		}

		return employee;
	}

	public async searchEmployees(
		emailOrUsername: string,
	): Promise<ISearchEmployee[]> {
		const employees: IEmployee[] = await this._employeeModel.find({
			$or: [
				{
					email: emailOrUsername,
				},
				{
					username: emailOrUsername,
				},
			],
		});

		const employeesSearched: ISearchEmployee[] = await Promise.all(
			employees.map(async (employee: IEmployee): Promise<ISearchEmployee> => {
				const user: IUser = await this._usersService.findOneById(
					employee.userId.toString(),
				);

				return {
					employeeName: employee.name,
					employeeUsername: employee.username,
					employeeAvatar: employee.avatar,
					employeeEmail: employee.email,
					employeeLevel: employee.level,
					employeeStatus: employee.status,
					userName: user.name,
					userUsername: user.username,
					userAvatar: user.avatar,
				};
			}),
		);

		return employeesSearched;
	}

	public async findByIdAndActive(employeeId: string): Promise<void> {
		await this._employeeModel.findByIdAndUpdate(
			new Types.ObjectId(employeeId),
			{
				$set: { status: EmployeesEnum.Status.ACTIVE },
			},
			{ new: true },
		);
	}

	public async uploadEmployees(
		files: Express.Multer.File[],
		userId: string,
		employeeId: string,
	): Promise<void> {
		const hasUploadProcessing: boolean =
			await this._filesUploadsService.hasUploadEmployeesProcessingByUserId(
				userId,
			);

		if (hasUploadProcessing) {
			throw new InternalServerErrorException(
				'In the moment you have upload employees files processing. please wait finish to try upload new files.',
			);
		}

		const tags: ITag[] = await this._tagsService.findByType(
			userId,
			TagsEnum.Type.EMPLOYEE,
		);

		const now: Date = new Date();

		this._filesService
			.getUploadFilesUrl(files)
			.then(async (filenames: string[]) => {
				const filesUploads: IFileUpload[] =
					await this._filesUploadsService.createMulti({
						employeeId,
						filenames,
						type: FilesUploadsEnum.Type.UPLOAD_EMPLOYEES,
						userId,
					});

				const fileUploadTemplateErrors: IFileUploadTemplateError<IEmployeeFileUploadTemplateRow>[] =
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

					const fileUploadTemplateError: IFileUploadTemplateError<IEmployeeFileUploadTemplateRow> =
						{
							filename,
							fileNumber: index + 1,
							rowsError: [],
							processError: undefined,
							fileColumns: {
								rowNumber: 'Row Number',
								name: 'Name',
								email: 'Email',
								password: 'Password',
								birthDate: 'Birth Date',
								gender: 'Gender',
								tags: 'Tags',
								level: 'Level',
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
						const employeeFileUploadTemplateRows: IEmployeeFileUploadTemplateRow[] =
							await this._getEmployeeFileUploadTemplateRowsByFilename(filename);

						await this._filesUploadsService.findByIdAndUpdate(fileUploadId, {
							$set: {
								updatedAt: new Date(),
								totalToProcess: employeeFileUploadTemplateRows.length,
							},
						});

						fileUploadTemplateError.rowsError =
							await this._processEmployeeFileUploadTemplateRows(
								employeeFileUploadTemplateRows,
								userId,
								tags,
								now,
								filename,
							);

						await this._filesUploadsService.findByIdAndUpdate(fileUploadId, {
							$set: {
								updatedAt: new Date(),
								totalError: fileUploadTemplateError.rowsError.length,
								totalSuccess:
									employeeFileUploadTemplateRows.length -
									fileUploadTemplateError.rowsError.length,
								totalProcessed: employeeFileUploadTemplateRows.length,
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

					this._socketsGateway.handleResponseUploadEmployeesFileToUser(userId);
				}

				this._socketsGateway.handleUploadEmployeesResponseToEmployee(
					fileUploadTemplateErrors,
					employeeId,
				);
			})
			.catch((error: any) => {
				this._logger.error(error);
				throw new Error('Error when attempt process employees upload.');
			});
	}

	public async downloadEmployees(
		userId: string,
		filters: IFiltersDownloadEmployees,
	): Promise<Buffer> {
		const filter: FilterQuery<IEmployee> = {
			userId,
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
				{
					username: search,
				},
			];
		}

		if (filters.gender) {
			filter.gender = { $in: filters.gender };
		}

		if (filters.level?.length) {
			filter.level = { $in: filters.level };
		}

		if (filters.status?.length) {
			filter.status = { $in: filters.status };
		}

		if (filters.tagsIds?.length) {
			filter.tagsIds = { $in: filters.tagsIds };
		}

		const employees: IEmployee[] = await this._employeeModel.find(
			filter,
			null,
			queryOptionsBySort<IEmployee>({
				field: filters.sortField as any,
				order: filters.sortOrder,
			}),
		);

		const tags: ITag[] = await this._tagsService.findByType(
			userId,
			TagsEnum.Type.EMPLOYEE,
		);

		const workbook: ExcelJS.Workbook = new ExcelJS.Workbook();
		const worksheet: ExcelJS.Worksheet = workbook.addWorksheet('Data');

		const columns = {
			name: 'Name',
			email: 'Email',
			birthDate: 'Birth Date',
			gender: 'Gender',
			tags: 'Tags',
			level: 'Level',
			about: 'About',
			addresses: 'Addresses',
			phones: 'Phones',
			createdAt: 'Created At',
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

		for (const employee of employees) {
			const tagsNames: string = employee.tagsIds.reduce(
				(acc: string, tagId, index: number) => {
					const tag = find(tags, { _id: tagId }) as ITag | undefined;

					const isLastIndex: boolean = employee.tagsIds.length - 1 === index;

					if (tag) {
						acc += `${tag.name}${isLastIndex ? '' : ', '}`;
					}

					return acc;
				},
				'',
			);

			const addresses: string = employee.addresses.reduce(
				(acc: string, address: IAddress, index: number) => {
					acc += `${index === 0 ? '' : '\n'}(${index + 1}) ${createAddressName(
						address,
					)}`;

					return acc;
				},
				'',
			);

			const phones: string = employee.phoneNumbers.reduce(
				(acc: string, phone: IPhoneNumber, index: number) => {
					acc += `${index === 0 ? '' : '\n'}(${
						index + 1
					}) ${createPhoneNumberName(phone)}`;

					return acc;
				},
				'',
			);

			worksheet.addRow({
				name: employee.name,
				email: employee.email,
				birthDate: employee.birthDate,
				gender: PersonEnum.GenderLabels[employee.gender],
				tags: tagsNames,
				level: EmployeesEnum.LevelLabels[employee.level],
				about: employee.about,
				addresses: addresses,
				phones: phones,
				createdAt: employee.createdAt,
			});
		}

		const buffer = await workbook.xlsx.writeBuffer();
		return buffer as Buffer;
	}

	// #endregion

	// #region Private Methods

	private async _getEmployeeFileUploadTemplateRowsByFilename(
		filename: string,
	): Promise<IEmployeeFileUploadTemplateRow[]> {
		const fileBuffer: Buffer | null =
			await this._filesService.getFileBufferByFilename(filename);

		if (!fileBuffer) {
			throw new Error(`File Error, no data in file: ${filename}`);
		}

		const workbook: ExcelJS.Workbook = new ExcelJS.Workbook();
		await workbook.xlsx.load(fileBuffer);

		const worksheet: ExcelJS.Worksheet = workbook.getWorksheet('Template');

		this._employeesValidationService.validateEmployeesUploadTemplate(
			worksheet.getRow(1),
		);

		const worksheetRowsCountToIterate: number = worksheet.rowCount + 1;

		const employeeFileUploadTemplateRows: IEmployeeFileUploadTemplateRow[] = [];

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
			const password: string = row.getCell('C')?.text?.trim();
			const birthDate: string = row.getCell('D')?.text?.trim();
			const gender: string = row.getCell('E')?.text?.trim();
			const tags: string = row.getCell('F')?.text?.trim();
			const level: string = row.getCell('G')?.text?.trim();
			const about: string = row.getCell('H')?.text?.trim();
			const country: string = row.getCell('I')?.text?.trim();
			const state: string = row.getCell('J')?.text?.trim();
			const city: string = row.getCell('K')?.text?.trim();
			const zipCode: string = row.getCell('L')?.text?.trim();
			const address1: string = row.getCell('M')?.text?.trim();
			const address2: string = row.getCell('N')?.text?.trim();
			const district: string = row.getCell('O')?.text?.trim();
			const addressDescription: string = row.getCell('P')?.text?.trim();
			const addressTypes: string = row.getCell('Q')?.text?.trim();
			const phoneType: string = row.getCell('R')?.text?.trim();
			const phoneNumber: string = row.getCell('S')?.text?.trim();
			const phoneMessengers: string = row.getCell('T')?.text?.trim();

			employeeFileUploadTemplateRows.push({
				rowNumber,
				name,
				password,
				level,
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

		return employeeFileUploadTemplateRows;
	}

	private async _processEmployeeFileUploadTemplateRows(
		employeeFileUploadTemplateRows: IEmployeeFileUploadTemplateRow[],
		userId: string,
		tags: ITag[],
		now: Date,
		filename: string,
	): Promise<IFileUploadTemplateErrorRow<IEmployeeFileUploadTemplateRow>[]> {
		const employeesToCreate: IEmployee[] = [];

		const fileUploadTemplateErrorRows: IFileUploadTemplateErrorRow<IEmployeeFileUploadTemplateRow>[] =
			[];

		for await (const employeeFileUploadTemplateRow of employeeFileUploadTemplateRows) {
			const fileUploadTemplateErrorRow: IFileUploadTemplateErrorRow<IEmployeeFileUploadTemplateRow> =
				{
					rowNumber: employeeFileUploadTemplateRow.rowNumber,
					reasons: [],
				};

			try {
				if (!employeeFileUploadTemplateRow.name?.trim()) {
					fileUploadTemplateErrorRow.reasons.push({
						message: 'Name is required!',
						property: 'name',
					});
				}

				if (!employeeFileUploadTemplateRow.email?.trim()) {
					fileUploadTemplateErrorRow.reasons.push({
						message: 'Email is required!',
						property: 'email',
					});
				} else if (!isValidEmail(employeeFileUploadTemplateRow.email)) {
					fileUploadTemplateErrorRow.reasons.push({
						message: 'Email is invalid!',
						property: 'email',
					});
				}

				if (!employeeFileUploadTemplateRow.password?.trim()) {
					fileUploadTemplateErrorRow.reasons.push({
						message: 'Password is required!',
						property: 'password',
					});
				}

				const birthDate: Date | null = employeeFileUploadTemplateRow.birthDate
					? parseToDate(employeeFileUploadTemplateRow.birthDate)
					: null;

				if (employeeFileUploadTemplateRow.birthDate) {
					if (!birthDate) {
						fileUploadTemplateErrorRow.reasons.push({
							message: 'Birth Date invalid format!',
							property: 'birthDate',
						});
					}
				}

				if (
					employeeFileUploadTemplateRow.gender &&
					!includes(
						Object.keys(PersonEnum.Gender),
						employeeFileUploadTemplateRow.gender.toUpperCase(),
					)
				) {
					fileUploadTemplateErrorRow.reasons.push({
						message: 'Gender invalid!',
						property: 'gender',
					});
				}

				if (
					employeeFileUploadTemplateRow.level &&
					!includes(
						Object.keys(EmployeesEnum.Level),
						employeeFileUploadTemplateRow.level.toUpperCase(),
					)
				) {
					fileUploadTemplateErrorRow.reasons.push({
						message: 'Level invalid!',
						property: 'level',
					});
				}

				if (
					employeeFileUploadTemplateRow.address1 ||
					employeeFileUploadTemplateRow.country ||
					employeeFileUploadTemplateRow.state ||
					employeeFileUploadTemplateRow.city ||
					employeeFileUploadTemplateRow.zipCode ||
					employeeFileUploadTemplateRow.district
				) {
					if (!employeeFileUploadTemplateRow.address1?.trim()) {
						fileUploadTemplateErrorRow.reasons.push({
							message: 'Address1 invalid!',
							property: 'address1',
						});
					}

					if (!employeeFileUploadTemplateRow.country?.trim()) {
						fileUploadTemplateErrorRow.reasons.push({
							message: 'Country invalid!',
							property: 'country',
						});
					}

					if (!employeeFileUploadTemplateRow.state?.trim()) {
						fileUploadTemplateErrorRow.reasons.push({
							message: 'State invalid!',
							property: 'state',
						});
					}

					if (!employeeFileUploadTemplateRow.city?.trim()) {
						fileUploadTemplateErrorRow.reasons.push({
							message: 'City invalid!',
							property: 'city',
						});
					}

					if (!employeeFileUploadTemplateRow.zipCode) {
						fileUploadTemplateErrorRow.reasons.push({
							message: 'Zip Code invalid!',
							property: 'zipCode',
						});
					}

					if (!employeeFileUploadTemplateRow.district?.trim()) {
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

				const employeeToUpdate: IEmployee | null =
					employeeFileUploadTemplateRow.email && birthDate
						? await this.findByMainPropertiesAndUserId(
								employeeFileUploadTemplateRow.name,
								employeeFileUploadTemplateRow.email,
								birthDate,
								userId,
						  )
						: null;

				const tagsByEmployeeUploadTemplateRow: string[] =
					await this._getTagsByEmployeeFileUploadTemplateRow(
						employeeFileUploadTemplateRow.tags,
						userId,
						tags,
						arrayObjectIdToString(employeeToUpdate?.tagsIds as any[]),
					);

				const tagsIds: Types.ObjectId[] = arrayStringToObjectId(
					tagsByEmployeeUploadTemplateRow,
				);

				const phoneNumbers: IPhoneNumber[] =
					this._getPhoneNumbersByEmployeeFileUploadTemplateRow(
						employeeFileUploadTemplateRow,
						employeeToUpdate?.phoneNumbers,
					);

				const addresses: IAddress[] =
					this._getAddressesByEmployeeFileUploadTemplateRow(
						employeeFileUploadTemplateRow,
						employeeToUpdate?.addresses,
					);

				const hashPassword: string | undefined =
					await this._hashCrypt.generateHash(
						employeeFileUploadTemplateRow.password,
					);

				if (employeeToUpdate) {
					employeeToUpdate.gender = employeeFileUploadTemplateRow.gender
						? (employeeFileUploadTemplateRow.gender.toUpperCase() as PersonEnum.Gender)
						: employeeToUpdate.gender;
					employeeToUpdate.tagsIds = tagsIds as any[];
					employeeToUpdate.about =
						employeeFileUploadTemplateRow.about ?? employeeToUpdate.about;
					employeeToUpdate.phoneNumbers = phoneNumbers;
					employeeToUpdate.addresses = addresses;
					employeeToUpdate.level = employeeFileUploadTemplateRow.level?.trim()
						? (employeeFileUploadTemplateRow.level.toUpperCase() as EmployeesEnum.Level)
						: employeeToUpdate.level;
					employeeToUpdate.password = hashPassword;

					await this._employeeModel.updateOne(
						{
							_id: new Types.ObjectId(employeeToUpdate._id),
						},
						{
							$set: employeeToUpdate,
						},
					);
				} else {
					employeesToCreate.push({
						avatar: null,
						name: employeeFileUploadTemplateRow.name,
						email: employeeFileUploadTemplateRow.email,
						birthDate: birthDate,
						addresses,
						gender: employeeFileUploadTemplateRow.gender
							? (employeeFileUploadTemplateRow.gender.toUpperCase() as PersonEnum.Gender)
							: PersonEnum.Gender.OTHER,
						about: employeeFileUploadTemplateRow.about,
						phoneNumbers,
						tagsIds: tagsIds as any[],
						userId: userId as any,
						createdAt: now,
						updatedAt: now,
						_id: null,
						isMain: false,
						level: employeeFileUploadTemplateRow.level?.trim()
							? (employeeFileUploadTemplateRow.level.toUpperCase() as EmployeesEnum.Level)
							: EmployeesEnum.Level.EMPLOYEE,
						password: hashPassword,
						status: EmployeesEnum.Status.PENDING,
						username: createUsernameByName(employeeFileUploadTemplateRow.name),
						uploadFilename: filename,
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

		if (employeesToCreate.length > 0) {
			await this._employeeModel.create(employeesToCreate);
		}

		return fileUploadTemplateErrorRows;
	}

	private async _getTagsByEmployeeFileUploadTemplateRow(
		tagsFromRow: string,
		userId: string,
		tagsFromUser: ITag[] = [],
		tagsIdsFromEmployee: string[] = [],
	): Promise<string[]> {
		if (!tagsFromRow?.trim()) {
			return tagsIdsFromEmployee;
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
					if (!includes(tagsIdsFromEmployee, tagIdFromUser)) {
						tagsIdsFromEmployee.push(tagIdFromUser);
					}
				} else {
					const tagCreated: ITag = await this._tagsService.create({
						color: TagsEnum.tagDefaultColor,
						description: null,
						name: tagFromRow,
						type: TagsEnum.Type.EMPLOYEE,
						userId,
					});

					tagsFromUser.push(tagCreated);
					tagsIdsFromEmployee.push(tagCreated._id);
				}
			} catch (error: any) {
				this._logger.error(error);
			}
		}

		return tagsIdsFromEmployee;
	}

	private _getPhoneNumbersByEmployeeFileUploadTemplateRow(
		employeeFileUploadTemplateRow: IEmployeeFileUploadTemplateRow,
		phoneNumbers: IPhoneNumber[] = [],
	): IPhoneNumber[] {
		const phoneNumber: string | null = employeeFileUploadTemplateRow.phoneNumber
			? employeeFileUploadTemplateRow.phoneNumber.toString().trim()
			: null;

		let phoneType: string | null = employeeFileUploadTemplateRow.phoneType
			? employeeFileUploadTemplateRow.phoneType?.toUpperCase().trim()
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
			employeeFileUploadTemplateRow.phoneMessengers?.trim()
				? employeeFileUploadTemplateRow.phoneMessengers
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

	private _getAddressesByEmployeeFileUploadTemplateRow(
		employeeFileUploadTemplateRow: IEmployeeFileUploadTemplateRow,
		addresses: IAddress[] = [],
	): IAddress[] {
		if (
			!(
				employeeFileUploadTemplateRow.address1 ||
				employeeFileUploadTemplateRow.country ||
				employeeFileUploadTemplateRow.state ||
				employeeFileUploadTemplateRow.city ||
				employeeFileUploadTemplateRow.zipCode ||
				employeeFileUploadTemplateRow.district
			)
		) {
			return addresses;
		}

		employeeFileUploadTemplateRow.address1 =
			employeeFileUploadTemplateRow.address1?.trim();
		employeeFileUploadTemplateRow.country =
			employeeFileUploadTemplateRow.country?.trim();
		employeeFileUploadTemplateRow.state =
			employeeFileUploadTemplateRow.state?.trim();
		employeeFileUploadTemplateRow.city =
			employeeFileUploadTemplateRow.city?.trim();
		employeeFileUploadTemplateRow.zipCode =
			employeeFileUploadTemplateRow.zipCode &&
			String(employeeFileUploadTemplateRow.zipCode)?.trim();
		employeeFileUploadTemplateRow.district =
			employeeFileUploadTemplateRow.district?.trim();

		const country: ICountryMockData = find(
			countries,
			(country: ICountryMockData) =>
				country.code === employeeFileUploadTemplateRow.country ||
				country.name === employeeFileUploadTemplateRow.country,
		) ?? {
			code: employeeFileUploadTemplateRow.country,
			name: employeeFileUploadTemplateRow.country,
		};

		const state: IStateMockData = find(
			states,
			(state: IStateMockData) =>
				state.code === employeeFileUploadTemplateRow.state ||
				state.name === employeeFileUploadTemplateRow.state,
		) ?? {
			code: employeeFileUploadTemplateRow.state,
			name: employeeFileUploadTemplateRow.state,
		};

		const types: AddressEnum.Type[] = (
			employeeFileUploadTemplateRow.addressTypes
				? employeeFileUploadTemplateRow.addressTypes
						.toUpperCase()
						.split(',')
						.map((addressType: string) => addressType.trim())
						.filter((addressType: string) =>
							includes(Object.keys(AddressEnum.Type), addressType),
						)
				: []
		) as AddressEnum.Type[];

		addresses.push({
			address1: employeeFileUploadTemplateRow.address1,
			address2: employeeFileUploadTemplateRow.address2,
			city: employeeFileUploadTemplateRow.city,
			country,
			description: employeeFileUploadTemplateRow.addressDescription,
			district: employeeFileUploadTemplateRow.district,
			isValid: true,
			state,
			uid: Date.now().toString(),
			zip: employeeFileUploadTemplateRow.zipCode.toString(),
			types,
		});

		return addresses;
	}

	// #endregion
}

import { ManagedUpload } from 'aws-sdk/clients/s3';
import { AnyKeys, AnyObject, FilterQuery, Model, Types } from 'mongoose';

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { schemasName } from '../../infra/database/mongo/schemas';
import HashCrypt from '../../infra/hash-crypt/hash-crypt';
import PersonEnum from '../../shared/enums/person.enum';
import { createUsernameByName } from '../../shared/utils/global/global';
import { queryOptions } from '../../shared/utils/table/table-state';
import {
	ITableStateRequest,
	ITableStateResponse,
} from '../../shared/utils/table/table-state.interface';
import { FilesService } from '../files/files-service';
import { NotificationsService } from '../notifications/notifications.service';
import { IUser } from '../users/interfaces/user.interface';
import { UsersService } from '../users/users.service';
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

	// #endregion
}

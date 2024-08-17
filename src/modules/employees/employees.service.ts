import { ManagedUpload } from 'aws-sdk/clients/s3';
import { AnyKeys, AnyObject, FilterQuery, Model } from 'mongoose';

import {
	forwardRef,
	Inject,
	Injectable,
	Logger,
	NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { schemasName } from '../../infra/database/mongo/schemas';
import HashCrypt from '../../infra/hash-crypt/hash-crypt';
import { FilesService } from '../../infra/services/files/files-service';
import PersonEnum from '../../shared/enums/person.enum';
import { createUsernameByName } from '../../shared/utils/global/global';
import { queryOptions } from '../../shared/utils/table/table-state';
import {
	ITableStateRequest,
	ITableStateResponse,
} from '../../shared/utils/table/table-state.interface';
import { NotificationsService } from '../notifications/notifications.service';
import { IUser } from '../users/interfaces/user.interface';
import { UsersService } from '../users/users.service';
import CreateEmployeeDto from './interfaces/dto/createEmployee.dto';
import UpdateEmployeeDto from './interfaces/dto/updateEmployee.dto';
import EmployeeEnum from './interfaces/employee.enum';
import { IEmployee } from './interfaces/employee.interface';
import { Employee } from './interfaces/employee.schema';

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
		@Inject(forwardRef(() => UsersService))
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
		tableState: ITableStateRequest<IEmployee>,
	): Promise<ITableStateResponse<IEmployee[]>> {
		const filter: FilterQuery<IEmployee> = {
			userId,
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
			filter.gender = {
				$in: tableState.filters.gender as PersonEnum.Gender[],
			};
		}

		if (tableState?.filters?.tagsIds?.length) {
			filter.tagsIds = { $in: tableState.filters.tagsIds };
		}

		if (tableState?.filters?.level?.length) {
			filter.level = { $in: tableState.filters.level };
		}

		const response: ITableStateResponse<IEmployee[]> = {
			data: [],
			total: 0,
		};

		response.total = await this._employeeModel.countDocuments(filter);
		response.data = await this._employeeModel.find(
			filter,
			null,
			queryOptions<IEmployee>(tableState),
		);

		return response;
	}

	public async create(
		file: Express.Multer.File | null,
		createEmployeeDto: CreateEmployeeDto,
	): Promise<IEmployee> {
		await this.validateCreateOrUpdate(
			createEmployeeDto.userId,
			createEmployeeDto.name,
			createEmployeeDto.email,
		);

		const user: IUser = await this._usersService.findOneByUserIdOrFail(
			createEmployeeDto.userId,
		);

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
			userId: createEmployeeDto.userId,
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
			status: createEmployeeDto.status ?? EmployeeEnum.Status.PENDING,
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

		const user: IUser = await this._usersService.findOneByUserIdOrFail(
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
				level: EmployeeEnum.Level.ADMIN,
				status: EmployeeEnum.Status.PENDING,
			},
			{
				$set: { status: EmployeeEnum.Status.ACTIVE },
			},
			{ new: true },
		);
	}

	// #endregion
}

import { ManagedUpload } from 'aws-sdk/clients/s3';
import { Model, Types } from 'mongoose';

import {
	BadRequestException,
	forwardRef,
	Inject,
	Injectable,
	Logger,
	NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import AuthorizationToken from '../../infra/authorization/authorization-token';
import { schemasName } from '../../infra/database/mongo/schemas';
import HashCrypt from '../../infra/hash-crypt/hash-crypt';
import { FilesService } from '../../infra/services/files/files-service';
import { createUsernameByEmail } from '../../shared/utils/global/global';
import { IAuthPayload } from '../auth/interfaces/auth.types';
import { CodesService } from '../codes/codes.service';
import { EmployeesService } from '../employees/employees.service';
import { IEmployee } from '../employees/interfaces/employee.interface';
import { INotificationResponse } from '../notifications/interfaces/notification.types';
import { NotificationsService } from '../notifications/notifications.service';
import RecoverPasswordDto from './interfaces/dto/recoverPassword.dto';
import UpdateEmailDto from './interfaces/dto/updateEmail.dto';
import UpdateUserDto from './interfaces/dto/updateUser.dto';
import UpdateUserAddressesDto from './interfaces/dto/updateUserAddresses.dto';
import UpdateUserPhoneNumbersDto from './interfaces/dto/updateUserPhoneNumbers.dto';
import UserEntity from './interfaces/user.entity';
import { IUser } from './interfaces/user.interface';
import UsersEnum from './interfaces/users.enum';
import { IUserEntity } from './interfaces/users.types';

@Injectable()
export class UsersService {
	// #region Private Properties

	private readonly _logger: Logger;

	// #endregion

	//#region Constructors

	constructor(
		@InjectModel(schemasName.user) private readonly _userModel: Model<IUser>,
		private readonly _hashCrypt: HashCrypt,
		private readonly _authorizationToken: AuthorizationToken,
		private readonly _notificationsService: NotificationsService,
		private readonly _filesService: FilesService,
		@Inject(forwardRef(() => EmployeesService))
		public readonly employeesService: EmployeesService,
		public readonly codesService: CodesService,
	) {
		this._logger = new Logger(UsersService.name);
	}

	//#endregion

	//#region Public Methods

	public async findOneByUsername(username: string): Promise<IUser | undefined> {
		return this._userModel.findOne({ username });
	}

	public async findOneByEmail(email: string): Promise<IUser | undefined> {
		return this._userModel.findOne({ email });
	}

	public async findOneByEmailOrFail(email: string): Promise<IUser> {
		const user: IUser | undefined = await this.findOneByEmail(email);

		if (!user) {
			throw new NotFoundException('User not found!');
		}

		return user;
	}

	public async findOneByEmailOrUsernameOrFail(
		emailOrUsername: string,
	): Promise<IUser> {
		const user: IUser | undefined = await this._userModel.findOne({
			$or: [{ email: emailOrUsername }, { username: emailOrUsername }],
		});

		if (!user) {
			throw new NotFoundException('User not found!');
		}

		return user;
	}

	public async findOneById(userId: string): Promise<IUser | undefined> {
		return this._userModel.findById(userId);
	}

	public async findOneByIdOrFail(userId: string): Promise<IUser> {
		const user: IUser | undefined = await this.findOneById(userId);

		if (!user) {
			throw new NotFoundException('User not found!');
		}

		return user;
	}
	public async insert(user: any): Promise<IUser> {
		const newUser = new this._userModel(user);

		return await newUser.save();
	}

	public async validateSignInCode(
		userId: string,
		value: string,
	): Promise<boolean> {
		const isValidatedSignInCode: boolean =
			await this.codesService.validateSignIn(userId, value);

		if (!isValidatedSignInCode) {
			return false;
		}

		const user: IUser = await this.findOneByIdOrFail(userId);

		if (user.status === UsersEnum.Status.ACTIVE) {
			return true;
		}

		await this._userModel.findByIdAndUpdate(
			userId,
			{
				$set: { status: UsersEnum.Status.ACTIVE },
			},
			{ new: true },
		);

		await this.employeesService.activeAdminByUserId(userId);

		return true;
	}

	public async sendRecoverPasswordCode(email: string): Promise<void> {
		const user: IUser = await this.findOneByEmailOrFail(email);

		const notificationResponse: INotificationResponse =
			await this._notificationsService.sendRecoverPasswordCode(user);

		if (!notificationResponse.email) {
			throw new BadRequestException(
				'Error when attempt to send recover password code to user',
			);
		}
	}

	public async recoverPassword(
		recoverPasswordDto: RecoverPasswordDto,
	): Promise<void> {
		const user: IUser = await this.findOneByEmailOrFail(
			recoverPasswordDto.email,
		);

		const isValidatedRecoverPassword: boolean =
			await this.codesService.validateRecoverPassword(
				user._id,
				recoverPasswordDto.codeValue,
			);

		if (!isValidatedRecoverPassword) {
			throw new BadRequestException('Invalid recover password code');
		}

		const hashPassword: string = await this._hashCrypt.generateHash(
			recoverPasswordDto.newPassword,
		);

		await this._userModel.findOneAndUpdate(new Types.ObjectId(user._id), {
			$set: {
				password: hashPassword,
				updatedAt: new Date(),
			},
		});
	}

	public async updateUser(
		userId: string,
		employeeId: string,
		updateUserDto: UpdateUserDto,
	): Promise<IUserEntity> {
		const userUpdated: IUser = await this._userModel.findOneAndUpdate(
			new Types.ObjectId(userId),
			{
				$set: {
					name: updateUserDto.name,
					birthDate: updateUserDto.birthDate,
					gender: updateUserDto.gender,
					about: updateUserDto.about,
					updatedAt: new Date(),
				},
			},
			{
				new: true,
			},
		);

		return this._getUserEntity(userUpdated, employeeId);
	}

	public async updateUserAddresses(
		userId: string,
		employeeId: string,
		updateUserAddressesDto: UpdateUserAddressesDto,
	): Promise<IUserEntity> {
		const userUpdated: IUser = await this._userModel.findOneAndUpdate(
			new Types.ObjectId(userId),
			{
				$set: {
					addresses: updateUserAddressesDto.addresses,
					updatedAt: new Date(),
				},
			},
			{
				new: true,
			},
		);

		return this._getUserEntity(userUpdated, employeeId);
	}

	public async updateUserPhoneNumbers(
		userId: string,
		employeeId: string,
		updatePhoneNumbers: UpdateUserPhoneNumbersDto,
	): Promise<IUserEntity> {
		const userUpdated: IUser = await this._userModel.findOneAndUpdate(
			new Types.ObjectId(userId),
			{
				$set: {
					phoneNumbers: updatePhoneNumbers.phoneNumbers,
					updatedAt: new Date(),
				},
			},
			{
				new: true,
			},
		);

		return this._getUserEntity(userUpdated, employeeId);
	}

	public async updateAvatar(
		userId: string,
		employeeId: string,
		file: Express.Multer.File,
	): Promise<IUserEntity> {
		const user: IUser = await this.findOneByIdOrFail(userId);

		const response: ManagedUpload.SendData =
			await this._filesService.uploadFile(file);

		await this._filesService.deleteFile(user.avatar);

		const userUpdated: IUser = await this._userModel.findOneAndUpdate(
			new Types.ObjectId(userId),
			{
				$set: {
					avatar: response.Key,
					updatedAt: new Date(),
				},
			},
			{
				new: true,
			},
		);

		return this._getUserEntity(userUpdated, employeeId);
	}

	public async removeAvatar(
		userId: string,
		employeeId: string,
	): Promise<IUserEntity> {
		const user: IUser = await this.findOneByIdOrFail(userId);

		await this._filesService.deleteFile(user.avatar);

		const userUpdated: IUser = await this._userModel.findOneAndUpdate(
			new Types.ObjectId(userId),
			{
				$set: {
					avatar: null,
					updatedAt: new Date(),
				},
			},
			{
				new: true,
			},
		);

		return this._getUserEntity(userUpdated, employeeId);
	}

	public async sendUpdateEmailCode(
		userId: string,
		email: string,
	): Promise<void> {
		const user: IUser = await this.findOneByIdOrFail(userId);

		if (user.email != email) {
			throw new BadRequestException('Incorrect user email.');
		}

		const notificationResponse: INotificationResponse =
			await this._notificationsService.sendUpdateEmailCode(user);

		if (!notificationResponse.email) {
			throw new BadRequestException(
				'Error when attempt to send update email code to user',
			);
		}
	}

	public async updateEmail(
		userId: string,
		employeeId: string,
		updateEmailDto: UpdateEmailDto,
	): Promise<IUserEntity> {
		const user: IUser = await this.findOneByIdOrFail(userId);

		if (user.email != updateEmailDto.email) {
			throw new BadRequestException('Incorrect user email.');
		}

		const findUserByEmail: IUser | undefined = await this.findOneByEmail(
			updateEmailDto.newEmail,
		);

		if (findUserByEmail && findUserByEmail._id !== user._id) {
			throw new BadRequestException(
				'Error when attempt to update email, email not allowed',
			);
		}

		const isValidatedUpdateCodeEmail: boolean =
			await this.codesService.validateUpdateEmail(
				user._id,
				updateEmailDto.codeValue,
			);

		if (!isValidatedUpdateCodeEmail) {
			throw new BadRequestException('Invalid update email code');
		}

		const newUser: IUser = await this._userModel.findOneAndUpdate(
			new Types.ObjectId(user._id),
			{
				$set: {
					email: updateEmailDto.newEmail,
					username: createUsernameByEmail(updateEmailDto.newEmail),
					updatedAt: new Date(),
				},
			},
			{
				new: true,
			},
		);

		return this.getUserEntityWithToken(newUser, employeeId);
	}

	public async getUserEntityWithToken(
		user: IUser,
		employeeId?: string,
	): Promise<IUserEntity> {
		const employee: IEmployee = employeeId
			? await this.employeesService.findByIdOrFail(employeeId)
			: await this.employeesService.findAdminByUserId(user._id);

		const payload: IAuthPayload = {
			_id: user._id,
			uid: user.uid,
			email: user.email,
			employeeId: employee._id,
		};

		const token: string = await this._authorizationToken.generateToken(payload);

		return (await new UserEntity(user).addToken(token)).addEmployee(employee);
	}

	//#rendegion

	//#region Private Methods

	private async _getUserEntity(
		user: IUser,
		employeeId?: string,
	): Promise<IUserEntity> {
		const employee: IEmployee = employeeId
			? await this.employeesService.findByIdOrFail(employeeId)
			: await this.employeesService.findAdminByUserId(user._id);

		return new UserEntity(user).addEmployee(employee);
	}

	//#rendegion
}

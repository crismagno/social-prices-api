import { ManagedUpload } from 'aws-sdk/clients/s3';
import { Model, Types } from 'mongoose';

import {
	BadRequestException,
	Injectable,
	Logger,
	NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { schemasName } from '../../infra/database/mongo/schemas';
import HashCrypt from '../../infra/hash-crypt/hash-crypt';
import { createUsernameByEmail } from '../../shared/utils/global/global';
import { CodesService } from '../codes/codes.service';
import { FilesService } from '../files/files-service';
import { INotificationResponse } from '../notifications/interfaces/notification.types';
import { NotificationsService } from '../notifications/notifications.service';
import { ISoftDelete } from '../../shared/common/soft-delete/soft-delete.interface';
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
		private readonly _notificationsService: NotificationsService,
		private readonly _filesService: FilesService,
		private readonly _codesService: CodesService,
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
			await this._codesService.validateRecoverPassword(
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

		return new UserEntity(userUpdated);
	}

	public async updateUserAddresses(
		userId: string,
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

		return new UserEntity(userUpdated);
	}

	public async updateUserPhoneNumbers(
		userId: string,
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

		return new UserEntity(userUpdated);
	}

	public async updateAvatar(
		userId: string,
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

		return new UserEntity(userUpdated);
	}

	public async removeAvatar(userId: string): Promise<IUserEntity> {
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

		return new UserEntity(userUpdated);
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
			await this._codesService.validateUpdateEmail(
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

		return new UserEntity(newUser);
	}

	public async findByIdAndActive(userId: string): Promise<void> {
		await this._userModel.findByIdAndUpdate(
			new Types.ObjectId(userId),
			{
				$set: { status: UsersEnum.Status.ACTIVE },
			},
			{ new: true },
		);
	}

	public async removeAccount(
		userId: string,
		softDelete: ISoftDelete,
	): Promise<void> {
		await this._userModel.findByIdAndUpdate(
			new Types.ObjectId(userId),
			{
				$set: {
					status: UsersEnum.Status.INACTIVE,
					softDelete,
					updatedAt: new Date(),
				},
			},
			{ new: true },
		);
	}

	//#rendegion
}

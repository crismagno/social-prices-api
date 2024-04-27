import { ManagedUpload } from 'aws-sdk/clients/s3';
import { randomUUID } from 'crypto';
import { Model, Types } from 'mongoose';

import {
	BadRequestException,
	forwardRef,
	Inject,
	Injectable,
	Logger,
	NotFoundException,
	UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import AuthorizationToken from '../../infra/authorization/authorization-token';
import { schemasName } from '../../infra/database/mongo/schemas';
import HashCrypt from '../../infra/hash-crypt/hash-crypt';
import { AmazonFilesService } from '../../infra/services/amazon/amazon-files-service';
import { createUsernameByEmail } from '../../shared/helpers/global';
import { IAuthPayload } from '../auth/interfaces/auth.types';
import { CodesService } from '../codes/codes.service';
import { INotificationResponse } from '../notifications/interfaces/notification.types';
import { NotificationsService } from '../notifications/notifications.service';
import CreateUserDto from './interfaces/dto/createUser.dto';
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
		@Inject(forwardRef(() => NotificationsService))
		private readonly _notificationsService: NotificationsService,
		private readonly _codesService: CodesService,
		private readonly _amazonFilesService: AmazonFilesService,
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

	public async findOneByUserId(userId: string): Promise<IUser | undefined> {
		return this._userModel.findById(userId);
	}

	public async findOneByUserIdOrFail(userId: string): Promise<IUser> {
		const user: IUser | undefined = await this.findOneByUserId(userId);

		if (!user) {
			throw new NotFoundException('User not found!');
		}

		return user;
	}

	public async signIn(email: string, password: string): Promise<IUserEntity> {
		const user: IUser = await this.findOneByEmailOrFail(email);

		const isPasswordMatch: boolean = await this._hashCrypt.isMatchCompare(
			password,
			user.password,
		);

		if (!isPasswordMatch) {
			throw new UnauthorizedException();
		}

		await this._notificationSendSignInCode(user);

		return this._getUserEntityWithToken(user);
	}

	public async signUp(createUserDto: CreateUserDto): Promise<IUserEntity> {
		try {
			const findUserByEmail: IUser | undefined = await this.findOneByEmail(
				createUserDto.email,
			);

			/**
			 * This part is when user tries to create a new user by Google
			 */
			if (findUserByEmail && createUserDto.authProvider) {
				await this._notificationSendSignInCode(findUserByEmail);

				return await this._getUserEntityWithToken(findUserByEmail);
			} else if (findUserByEmail) {
				this._logger.warn('signUp', createUserDto);
				throw new BadRequestException('User credentials error.');
			}

			const hashPassword: string = await this._hashCrypt.generateHash(
				createUserDto.password,
			);

			const now: Date = new Date();

			const newUser: IUser = new this._userModel({
				email: createUserDto.email,
				username: createUsernameByEmail(createUserDto.email),
				password: hashPassword,
				authProvider:
					createUserDto.authProvider ?? UsersEnum.Provider.SOCIAL_PRICES,
				phoneNumbers: createUserDto.phoneNumbers ?? [],
				status: UsersEnum.Status.PENDING,
				uid: createUserDto.uid ?? randomUUID(),
				avatar: createUserDto.avatar,
				extraDataProvider: createUserDto.extraDataProvider,
				addresses: [],
				firstName: null,
				lastName: null,
				middleName: null,
				birthDate: null,
				gender: UsersEnum.Gender.OTHER,
				about: createUserDto.about,
				createdAt: now,
				updatedAt: now,
			});

			const user: IUser = await newUser.save();

			await this._notificationSendSignInCode(user);

			return await this._getUserEntityWithToken(user);
		} catch (error: any) {
			this._logger.error(error);
			throw error;
		}
	}

	public async validateSignInCode(
		userId: string,
		value: string,
	): Promise<boolean> {
		const isValidatedSignInCode: boolean =
			await this._codesService.validateSignIn(userId, value);

		if (!isValidatedSignInCode) {
			return false;
		}

		const user: IUser = await this.findOneByUserIdOrFail(userId);

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

		return true;
	}

	public async getUserWIthTokenByUserId(userId: string): Promise<IUserEntity> {
		const user: IUser = await this.findOneByUserIdOrFail(userId);

		return this._getUserEntityWithToken(user);
	}

	public async getUserByUserId(userId: string): Promise<IUserEntity> {
		const user: IUser = await this.findOneByUserIdOrFail(userId);

		return this._getUserEntity(user);
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
		await this.findOneByUserIdOrFail(userId);

		const userUpdated: IUser = await this._userModel.findOneAndUpdate(
			new Types.ObjectId(userId),
			{
				$set: {
					firstName: updateUserDto.firstName,
					lastName: updateUserDto.lastName,
					middleName: updateUserDto.middleName,
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

		return this._getUserEntity(userUpdated);
	}

	public async updateUserAddresses(
		userId: string,
		updateUserAddressesDto: UpdateUserAddressesDto,
	): Promise<IUserEntity> {
		await this.findOneByUserIdOrFail(userId);

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

		return this._getUserEntity(userUpdated);
	}

	public async updateUserPhoneNumbers(
		userId: string,
		updatePhoneNumbers: UpdateUserPhoneNumbersDto,
	): Promise<IUserEntity> {
		await this.findOneByUserIdOrFail(userId);

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

		return this._getUserEntity(userUpdated);
	}

	public async updateAvatar(
		userId: string,
		file: Express.Multer.File,
	): Promise<IUserEntity> {
		const user: IUser = await this.findOneByUserIdOrFail(userId);

		const response: ManagedUpload.SendData =
			await this._amazonFilesService.uploadFile(file);

		await this._amazonFilesService.deleteFile(user.avatar);

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

		return this._getUserEntity(userUpdated);
	}

	public async removeAvatar(userId: string): Promise<IUserEntity> {
		await this.findOneByUserIdOrFail(userId);

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

		return this._getUserEntity(userUpdated);
	}

	public async sendUpdateEmailCode(
		userId: string,
		email: string,
	): Promise<void> {
		const user: IUser = await this.findOneByUserIdOrFail(userId);

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
		const user: IUser = await this.findOneByUserIdOrFail(userId);

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

		return this._getUserEntityWithToken(newUser);
	}

	public async getFileFromAmazonFiles(
		filename: string,
	): Promise<string | undefined> {
		return await this._amazonFilesService.getFileObject(filename);
	}

	//#rendegion

	//#region Private Methods

	private async _notificationSendSignInCode(user: IUser): Promise<void> {
		const notificationResponse: INotificationResponse =
			await this._notificationsService.sendSignInCode(user);

		if (!notificationResponse.email) {
			throw new BadRequestException(
				'Error when attempt to send signIn code to user',
			);
		}
	}

	private async _getUserEntityWithToken(user: IUser): Promise<IUserEntity> {
		const payload: IAuthPayload = {
			_id: user._id,
			uid: user.uid,
			email: user.email,
		};

		const token: string = await this._authorizationToken.generateToken(payload);

		return new UserEntity(user).addToken(token);
	}

	private _getUserEntity(user: IUser): IUserEntity {
		return new UserEntity(user);
	}

	//#rendegion
}

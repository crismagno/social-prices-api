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

import { IAuthPayload } from '../auth/interfaces/auth.types';
import { CodesService } from '../codes/codes.service';
import AuthorizationToken from '../config/authorization/authorization-token';
import HashCrypt from '../config/hash-crypt/hash-crypt';
import { INotificationResponse } from '../notification/interfaces/notification.types';
import { NotificationService } from '../notification/notification.service';
import { schemasName } from '../shared/modules/imports/schemas/schemas';
import CreateUserDto from './interfaces/dto/createUser.dto';
import RecoverPasswordDto from './interfaces/dto/recoverPassword.dto';
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
		@Inject(forwardRef(() => NotificationService))
		private readonly _notificationService: NotificationService,
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
		const user = await this._userModel.findOne({ email });

		if (!user) {
			throw new NotFoundException('User not found!');
		}

		return user;
	}

	public async findOneByUserId(userId: string): Promise<IUser | undefined> {
		return this._userModel.findById(userId);
	}

	public async findOneByUserIdOrFail(userId: string): Promise<IUser> {
		const user = await this._userModel.findById(userId);

		if (!user) {
			throw new NotFoundException('User not found!');
		}

		return user;
	}

	public async signIn(email: string, password: string): Promise<IUserEntity> {
		const user: IUser | undefined = await this.findOneByEmail(email);

		if (!user) {
			throw new NotFoundException('User not found!');
		}

		const isPasswordMatch: boolean = await this._hashCrypt.isMatchCompare(
			password,
			user?.password,
		);

		if (!isPasswordMatch) {
			throw new UnauthorizedException();
		}

		await this._notificationSendSignInCode(user);

		return this._getUserEntityWithToken(user);
	}

	public async signUp(createUserDto: CreateUserDto): Promise<IUserEntity> {
		try {
			const findUserByEmail = await this._userModel
				.findOne({
					email: createUserDto.email,
				})
				.exec();

			if (findUserByEmail && createUserDto.authProvider) {
				await this._notificationSendSignInCode(findUserByEmail);

				return await this._getUserEntityWithToken(findUserByEmail);
			} else if (findUserByEmail) {
				this._logger.warn('signUp', createUserDto);
				throw new BadRequestException('User credentials error.');
			}

			const hashPassword = await this._hashCrypt.generateHash(
				createUserDto.password,
			);

			const newUser: IUser = new this._userModel({
				email: createUserDto.email,
				username: createUserDto.username,
				password: hashPassword,
				authProvider:
					createUserDto.authProvider ?? UsersEnum.Provider.SOCIAL_PRICES,
				phoneNumbers: createUserDto.phoneNumbers ?? [],
				status: UsersEnum.Status.PENDING,
				uid: createUserDto.uid,
				avatar: createUserDto.avatar,
				extraDataProvider: createUserDto.extraDataProvider,
				addresses: [],
				firstName: null,
				lastName: null,
				middleName: null,
				birthDate: null,
				gender: null,
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
			await this._notificationService.sendRecoverPasswordCode(user);

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

		const hashPassword = await this._hashCrypt.generateHash(
			recoverPasswordDto.newPassword,
		);

		await this._userModel.findOneAndUpdate(user._id, {
			$set: {
				password: hashPassword,
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
				},
			},
			{
				new: true,
			},
		);

		return this._getUserEntity(userUpdated);
	}

	//#rendegion

	//#region Private Methods

	private async _notificationSendSignInCode(user: IUser): Promise<void> {
		const notificationResponse: INotificationResponse =
			await this._notificationService.sendSignInCode(user);

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

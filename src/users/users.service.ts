import { Model } from 'mongoose';

import {
	BadRequestException,
	forwardRef,
	Inject,
	Injectable,
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
import { IUser } from './interfaces/user.interface';
import UsersEnum from './interfaces/users.enum';
import { IUserEntity } from './interfaces/users.types';

@Injectable()
export class UsersService {
	//#region Constructors

	constructor(
		@InjectModel(schemasName.user) private readonly _userModel: Model<IUser>,
		private readonly _hashCrypt: HashCrypt,
		private readonly _authorizationToken: AuthorizationToken,
		@Inject(forwardRef(() => NotificationService))
		private readonly _notificationService: NotificationService,
		private readonly _codesService: CodesService,
	) {}

	//#endregion

	//#region Public Methods

	public async findOneByUsername(username: string): Promise<IUser | undefined> {
		return this._userModel.findOne({ username });
	}

	public async findOneByEmail(email: string): Promise<IUser | undefined> {
		return this._userModel.findOne({ email });
	}

	public async signIn(email: string, password: string): Promise<IUserEntity> {
		const user: IUser | undefined = await this.findOneByEmail(email);

		if (!user) {
			throw new BadRequestException('User not found!');
		}

		const isPasswordMatch: boolean = await this._hashCrypt.isMatchCompare(
			password,
			user?.password,
		);

		if (!isPasswordMatch) {
			throw new UnauthorizedException();
		}

		await this._notificationSendSignInCode(user);

		return this.getUserEntityFromUserSchema(user);
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

				return await this.getUserEntityFromUserSchema(findUserByEmail);
			} else if (findUserByEmail) {
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
			});

			const user: IUser = await newUser.save();

			await this._notificationSendSignInCode(user);

			return await this.getUserEntityFromUserSchema(user);
		} catch (error: any) {
			throw error;
		}
	}

	public async getUserEntityFromUserSchema(
		userSchema: IUser,
	): Promise<IUserEntity> {
		const payload: IAuthPayload = {
			_id: userSchema._id,
			uid: userSchema.uid,
			email: userSchema.email,
		};

		const userEntity: IUserEntity = {
			authProvider: userSchema.authProvider,
			authToken: await this._authorizationToken.generateToken(payload),
			avatar: userSchema.avatar,
			email: userSchema.email,
			phoneNumbers: userSchema.phoneNumbers,
			status: userSchema.status,
			username: userSchema.username,
			extraDataProvider: userSchema.extraDataProvider,
		};

		return userEntity;
	}

	public async validateSignInCode(
		userId: string,
		value: string,
	): Promise<boolean> {
		return this._codesService.validateSignIn(userId, value);
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

	//#rendegion
}

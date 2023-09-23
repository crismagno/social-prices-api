import { Model } from 'mongoose';

import {
	BadRequestException,
	Injectable,
	UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { IAuthPayload } from '../auth/interfaces/auth.types';
import AuthorizationToken from '../config/authorization/authorization-token';
import HashCrypt from '../config/hash-crypt/hash-crypt';
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
	) {}

	//#endregion Constructors

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

		return this.getUserEntityFromUserSchema(user);
	}

	public async signUp(createUserDto: CreateUserDto): Promise<IUserEntity> {
		const findUserByEmail = await this._userModel
			.findOne({
				email: createUserDto.email,
			})
			.exec();

		if (findUserByEmail && createUserDto.authProvider) {
			return await this.getUserEntityFromUserSchema(findUserByEmail);
		} else if (findUserByEmail) {
			throw new BadRequestException('User email not allowed.');
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

		return await this.getUserEntityFromUserSchema(user);
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

	//#rendegion Public Methods
}

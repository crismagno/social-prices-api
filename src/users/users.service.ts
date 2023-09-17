import { Model } from 'mongoose';

import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import HashCrypt from '../config/hash-crypt/hash-crypt';
import { schemasName } from '../shared/modules/imports/schemas/schemas';
import CreateUserDto from './interfaces/dto/createUser.dto';
import UserEnum from './interfaces/user.enum';
import { IUser } from './interfaces/user.interface';

@Injectable()
export class UsersService {
	//#region Private Properties

	private readonly _hashCrypt: HashCrypt;

	//#endregion Private Properties

	//#region Constructors

	constructor(
		@InjectModel(schemasName.user) private readonly _userModel: Model<IUser>,
	) {
		this._hashCrypt = new HashCrypt();
	}

	//#endregion Constructors

	//#region Public Methods

	public async findOneByUsername(username: string): Promise<IUser | undefined> {
		return this._userModel.findOne({ username });
	}

	public async signUp(createUserDto: CreateUserDto): Promise<IUser> {
		const findUserByEmail = await this._userModel
			.findOne({
				email: createUserDto.email,
			})
			.exec();

		if (findUserByEmail) {
			throw new BadRequestException('User email not allowed.');
		}

		const hashPassword = await this._hashCrypt.generateHash(
			createUserDto.password,
		);

		const newUser: IUser = new this._userModel({
			email: createUserDto.email,
			username: createUserDto.username,
			password: hashPassword,
			authProvider: UserEnum.provider.SOCIAL_PRICES,
			phoneNumbers: [],
		});

		return await newUser.save();
	}

	//#rendegion Public Methods
}

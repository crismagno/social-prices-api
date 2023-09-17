import { Model } from 'mongoose';

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { IUser } from './interfaces/user.interface';

@Injectable()
export class UsersService {
	constructor(@InjectModel('User') private _userModel: Model<IUser>) {}

	//#region Public Methods

	public async findOneByUsername(username: string): Promise<IUser | undefined> {
		return this._userModel.findOne({ username });
	}

	//#rendegion Public Methods
}

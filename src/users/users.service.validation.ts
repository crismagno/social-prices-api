import { Model } from 'mongoose';

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { schemasName } from '../shared/modules/imports/schemas/schemas';
import { IUser } from './interfaces/user.interface';

@Injectable()
export class UsersServiceValidation {
	// #region Private Properties

	private readonly _logger: Logger;

	// #endregion

	//#region Constructors

	constructor(
		@InjectModel(schemasName.user) private readonly _userModel: Model<IUser>,
	) {
		this._logger = new Logger(UsersServiceValidation.name);
	}
}

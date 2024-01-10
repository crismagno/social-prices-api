import { Model } from 'mongoose';

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { schemasName } from '../shared/modules/imports/schemas/schemas';
import CreateStoreDto from './interfaces/dto/createStore.dto';
import StoresEnum from './interfaces/stores.enum';
import { IStore } from './interfaces/stores.interface';

@Injectable()
export class StoresService {
	// #region Private Properties

	private readonly _logger: Logger;

	// #endregion

	// #region Constructor

	constructor(
		@InjectModel(schemasName.store) private readonly _storeModel: Model<IStore>,
	) {
		this._logger = new Logger(StoresService.name);
	}

	// #endregion

	// #region Public Methods

	public async create(
		createStoreDto: CreateStoreDto,
		userId: string,
	): Promise<IStore> {
		const store = new this._storeModel({
			name: createStoreDto.name,
			description: createStoreDto.description,
			logo: createStoreDto.logo,
			startedAt: createStoreDto.startedAt,
			status: StoresEnum.Status.ACTIVE,
			userId,
			email: createStoreDto.email,
		});

		return store.save();
	}

	// #endregion
}

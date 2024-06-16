import { Model } from 'mongoose';

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { schemasName } from '../../infra/database/mongo/schemas';
import { ICounter } from './interfaces/counter.interface';
import { Counter } from './interfaces/counter.schema';
import CountersEnum from './interfaces/counters.enum';

@Injectable()
export class CountersService {
	// #region Private Properties

	private readonly _logger: Logger;

	// #endregion

	//#region Constructors

	constructor(
		@InjectModel(schemasName.counter)
		private readonly _counterModel: Model<Counter>,
	) {
		this._logger = new Logger(CountersService.name);
	}

	//#endregion

	//#region Public Methods

	public async findNextNumberBySaleType(): Promise<number> {
		const counter: ICounter | undefined =
			await this._counterModel.findOneAndUpdate(
				{ type: CountersEnum.Type.SALE },
				{ $inc: { count: 1 } },
				{ returnOriginal: false, upsert: true },
			);

		if (counter) {
			return counter.count;
		}

		const now: Date = new Date();

		const newCounterModel = new this._counterModel({
			count: 1,
			type: CountersEnum.Type.SALE,
			createdAt: now,
			updatedAt: now,
		});

		const newCustomer: ICounter = await newCounterModel.save();

		return newCustomer.count;
	}

	//#endregion
}

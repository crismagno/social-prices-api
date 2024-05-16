import { FilterQuery, Model } from 'mongoose';

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { schemasName } from '../../infra/database/mongo/schemas';
import { queryOptions } from '../../shared/utils/table/table-state';
import {
	ITableStateRequest,
	ITableStateResponse,
} from '../../shared/utils/table/table-state.interface';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import CreateSaleDto from './interfaces/dto/createSale.dto';
import { ISale } from './interfaces/sale.interface';
import { Sale } from './interfaces/sale.schema';

@Injectable()
export class SalesService {
	// #region Private Properties

	private readonly _logger: Logger;

	// #endregion

	// #region Constructor

	constructor(
		@InjectModel(schemasName.sale)
		private readonly _saleModel: Model<Sale>,
		private readonly _usersService: UsersService,
		private readonly _notificationsService: NotificationsService,
	) {
		this._logger = new Logger(SalesService.name);
	}

	// #endregion

	// #region Public Methods

	public async findById(saleId: string): Promise<ISale | undefined> {
		return this._saleModel.findById(saleId);
	}

	public async countByOwnerUserId(ownerUserId: string): Promise<number> {
		return this._saleModel.countDocuments({ ownerUserId });
	}

	public async findByIdOrFail(saleId: string): Promise<ISale> {
		const sale: ISale | undefined = await this.findById(saleId);

		if (!sale) {
			throw new NotFoundException('Sale not found!');
		}

		return sale;
	}

	public async findByOwnerUserId(ownerUserId: string): Promise<ISale[]> {
		const sales: ISale[] = await this._saleModel.find({
			ownerUserId,
		});

		return sales;
	}

	public async findByOwnerUserTableState(
		ownerUserId: string,
		tableState: ITableStateRequest<ISale>,
	): Promise<ITableStateResponse<ISale[]>> {
		const filter: FilterQuery<ISale> = {
			ownerUserId,
		};

		if (tableState.search) {
			const search = new RegExp(tableState.search, 'ig');

			filter.$or = [
				{
					description: search,
				},
				{
					number: search,
				},
			];
		}

		const response: ITableStateResponse<ISale[]> = {
			data: [],
			total: 0,
		};

		response.total = await this._saleModel.countDocuments(filter);
		response.data = await this._saleModel.find(
			filter,
			null,
			queryOptions<ISale>(tableState),
		);

		return response;
	}

	public async create(createSaleDto: CreateSaleDto): Promise<ISale> {
		console.log(createSaleDto);

		return null;
	}

	// #endregion
}

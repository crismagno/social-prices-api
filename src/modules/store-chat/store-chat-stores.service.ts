import { escapeRegExp } from 'lodash';
import mongoose, { FilterQuery, Model, PipelineStage } from 'mongoose';

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { schemasName } from '../../infra/database/mongo/schemas';
import {
	ITableStateRequest,
	ITableStateResponse,
} from '../../shared/utils/table/table-state.interface';
import { ISale } from '../sales/interfaces/sale.interface';
import { Sale } from '../sales/interfaces/sale.schema';
import { IStore } from '../stores/interfaces/store.interface';
import { Store } from '../stores/interfaces/store.schema';
import StoresEnum from '../stores/interfaces/stores.enum';
import {
	IStoreChatBuyer,
	IStoreChatStoreCard,
} from './interfaces/store-chat.types';

const PAGE_SIZE: number = 20;

/**
 * Which stores a customer account can see and talk to, and how little of each
 * it gets: the public card. Everything a store shows a customer goes through here.
 */
@Injectable()
export class StoreChatStoresService {
	//#region Constructor

	constructor(
		@InjectModel(schemasName.store) private readonly _storeModel: Model<Store>,
		@InjectModel(schemasName.sale) private readonly _saleModel: Model<Sale>,
	) {}

	//#endregion

	//#region Public Methods

	/**
	 * The open search: active stores that chose to be listed, plus the ones the
	 * account bought from (those come first), never its own.
	 */
	public async search(
		buyer: IStoreChatBuyer,
		tableState: ITableStateRequest<IStore>,
	): Promise<ITableStateResponse<IStoreChatStoreCard[]>> {
		const boughtFrom: mongoose.Types.ObjectId[] =
			await this._boughtStoreIds(buyer);

		const match: FilterQuery<IStore> = {
			status: StoresEnum.Status.ACTIVE,
			softDelete: null,
			userId: { $ne: new mongoose.Types.ObjectId(buyer.userId) },
			$or: [
				{ isVisibleInSearch: { $ne: false } },
				{ _id: { $in: boughtFrom } },
			],
		};

		const search: string = (tableState?.search ?? '').trim();

		if (search) {
			match.name = new RegExp(escapeRegExp(search), 'i');
		}

		const pageSize: number = Math.min(
			Math.max(Number(tableState?.pagination?.pageSize) || PAGE_SIZE, 1),
			PAGE_SIZE,
		);

		const skip: number = Math.max(
			Number(tableState?.pagination?.skip) ||
				((Number(tableState?.pagination?.current) || 1) - 1) * pageSize,
			0,
		);

		const pipeline: PipelineStage[] = [
			{ $match: match },
			{ $addFields: { boughtFrom: { $in: ['$_id', boughtFrom] } } },
			{ $sort: { boughtFrom: -1, name: 1, _id: 1 } },
			{ $skip: skip },
			{ $limit: pageSize },
		];

		const total: number = await this._storeModel.countDocuments(match);

		const stores: IStore[] = await this._storeModel.aggregate(pipeline);

		return {
			total,
			data: stores.map((store: IStore) => this.toCard(store)),
		};
	}

	/** A store that can be talked to now: it exists, is active and was not deleted. */
	public async findUsable(storeId: string): Promise<IStore> {
		const store: IStore | null = mongoose.isValidObjectId(storeId)
			? await this._storeModel
					.findOne({
						_id: storeId,
						status: StoresEnum.Status.ACTIVE,
						softDelete: null,
					})
					.lean<IStore>()
			: null;

		if (!store) {
			throw new NotFoundException('Store not found.');
		}

		return store;
	}

	/** The cards of these stores, usable or not: a conversation keeps its store's name. */
	public async cardsByIds(
		storeIds: string[],
	): Promise<Map<string, IStoreChatStoreCard>> {
		const ids: string[] = [...new Set(storeIds)].filter((id: string) =>
			mongoose.isValidObjectId(id),
		);

		if (!ids.length) {
			return new Map();
		}

		const stores: IStore[] = await this._storeModel
			.find({ _id: { $in: ids } })
			.lean<IStore[]>();

		return new Map(
			stores.map((store: IStore) => [String(store._id), this.toCard(store)]),
		);
	}

	public toCard(store: IStore): IStoreChatStoreCard {
		return {
			_id: String(store._id),
			name: store.name,
			logo: store.logo ?? null,
			description: store.description ?? null,
			type: store.type ?? null,
		};
	}

	//#endregion

	//#region Private Methods

	/** The stores of the sales made for this account, matched as the customer portal does. */
	private async _boughtStoreIds(
		buyer: IStoreChatBuyer,
	): Promise<mongoose.Types.ObjectId[]> {
		const filter: FilterQuery<ISale> = {
			softDelete: null,
			$or: [
				{ 'buyer.userId': buyer.userId },
				{ 'buyer.email': new RegExp(`^${escapeRegExp(buyer.email)}$`, 'i') },
			],
		};

		const storeIds: unknown[] = await this._saleModel.distinct(
			'stores.storeId',
			filter,
		);

		return storeIds
			.map((id: unknown) => String(id))
			.filter((id: string) => mongoose.isValidObjectId(id))
			.map((id: string) => new mongoose.Types.ObjectId(id));
	}

	//#endregion
}

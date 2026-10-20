import mongoose, { Model } from 'mongoose';

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { schemasName } from '../../../infra/database/mongo/schemas';
import { createUsernameByName } from '../../../shared/utils/global/global';
import { ICustomer } from '../../customers/interfaces/customer.interface';
import { Customer } from '../../customers/interfaces/customer.schema';
import { ITelegramChat } from './telegram-chat.interface';
import { buildCustomerFromTelegramChat } from './telegram.customer-factory';

const UNIQ_NAME_ATTEMPTS: number = 5;

export interface ICustomerRef {
	_id: string;
	name: string | null;
}

/** How Telegram reads customers and makes new ones; the link itself lives on the chat. */
@Injectable()
export class TelegramCustomersRepository {
	//#region Constructor

	constructor(
		@InjectModel(schemasName.customer)
		private readonly _customerModel: Model<Customer>,
	) {}

	//#endregion

	//#region Public Methods

	public async findNames(
		ownerUserId: string,
		customerIds: string[],
	): Promise<ICustomerRef[]> {
		const valid: string[] = customerIds.filter((id: string) =>
			mongoose.isValidObjectId(id),
		);

		if (!valid.length) {
			return [];
		}

		return await this._customerModel
			.find({ ownerUserId, _id: { $in: valid } }, { name: 1 })
			.lean<ICustomerRef[]>();
	}

	/** A customer of this owner, or null: a malformed or foreign id never reaches the database as a cast error. */
	public async findOwned(
		ownerUserId: string,
		customerId: string,
	): Promise<ICustomerRef | null> {
		if (!mongoose.isValidObjectId(customerId)) {
			return null;
		}

		return await this._customerModel
			.findOne({ _id: customerId, ownerUserId }, { name: 1 })
			.lean<ICustomerRef>();
	}

	public async createFromChat(
		ownerUserId: string,
		chat: ITelegramChat,
	): Promise<ICustomerRef> {
		const draft = buildCustomerFromTelegramChat(ownerUserId, chat, '');

		const created: ICustomer = await this._customerModel.create({
			...draft,
			uniqName: await this._freeUniqName(ownerUserId, draft.name),
		});

		return { _id: created._id, name: created.name };
	}

	//#endregion

	//#region Private Methods

	/** uniqName is not unique in the schema, so avoid collisions here. */
	private async _freeUniqName(
		ownerUserId: string,
		name: string,
	): Promise<string> {
		const base: string = createUsernameByName(name);
		let candidate: string = base;

		for (let attempt = 0; attempt < UNIQ_NAME_ATTEMPTS; attempt++) {
			const taken = await this._customerModel.exists({
				ownerUserId,
				uniqName: candidate,
			});

			if (!taken) {
				return candidate;
			}

			candidate = `${base}${Math.floor(1000 + Math.random() * 9000)}`;
		}

		return candidate;
	}

	//#endregion
}

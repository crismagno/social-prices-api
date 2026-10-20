import mongoose, { Model } from 'mongoose';

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { schemasName } from '../../../infra/database/mongo/schemas';
import { createUsernameByName } from '../../../shared/utils/global/global';
import { ICustomer } from '../../customers/interfaces/customer.interface';
import { Customer } from '../../customers/interfaces/customer.schema';
import AppsEnum from '../interfaces/apps.enum';
import { IInstagramChat } from './instagram-chat.interface';
import { buildCustomerFromInstagramChat } from './instagram.customer-factory';

const UNIQ_NAME_ATTEMPTS: number = 5;

export interface ICustomerRef {
	_id: string;
	name: string | null;
}

/** How Instagram reads and writes customers: only through the Instagram source it keeps on them. */
@Injectable()
export class InstagramCustomersRepository {
	//#region Constructor

	constructor(
		@InjectModel(schemasName.customer)
		private readonly _customerModel: Model<Customer>,
	) {}

	//#endregion

	//#region Public Methods

	public async findByIgsid(
		ownerUserId: string,
		igsid: string,
	): Promise<ICustomerRef | null> {
		return await this._customerModel
			.findOne(
				{
					ownerUserId,
					externalSources: {
						$elemMatch: {
							appId: AppsEnum.App.INSTAGRAM,
							externalId: igsid,
						},
					},
				},
				{ name: 1 },
			)
			.lean<ICustomerRef>();
	}

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
		chat: IInstagramChat,
	): Promise<ICustomerRef> {
		const draft = buildCustomerFromInstagramChat(ownerUserId, chat, '');

		const created: ICustomer = await this._customerModel.create({
			...draft,
			uniqName: await this._freeUniqName(ownerUserId, draft.name),
		});

		return { _id: created._id, name: created.name };
	}

	/**
	 * Records the Instagram person on an existing customer and touches nothing else.
	 * A customer holds one Instagram contact, so false means it already has one.
	 */
	public async linkInstagramSource(
		ownerUserId: string,
		customerId: string,
		igsid: string,
	): Promise<boolean> {
		const result = await this._customerModel.updateOne(
			{
				_id: customerId,
				ownerUserId,
				'externalSources.appId': { $ne: AppsEnum.App.INSTAGRAM },
			},
			{
				$push: {
					externalSources: {
						appId: AppsEnum.App.INSTAGRAM,
						externalId: igsid,
					},
				},
				$set: { updatedAt: new Date() },
			},
		);

		return result.modifiedCount > 0;
	}

	public async unlinkInstagramSource(
		ownerUserId: string,
		customerId: string,
	): Promise<void> {
		await this._customerModel.updateOne(
			{ _id: customerId, ownerUserId },
			{
				$pull: { externalSources: { appId: AppsEnum.App.INSTAGRAM } },
				$set: { updatedAt: new Date() },
			},
		);
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

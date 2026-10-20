import mongoose, { Model } from 'mongoose';

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { schemasName } from '../../../infra/database/mongo/schemas';
import { createUsernameByName } from '../../../shared/utils/global/global';
import { ICustomer } from '../../customers/interfaces/customer.interface';
import { Customer } from '../../customers/interfaces/customer.schema';
import AppsEnum from '../interfaces/apps.enum';
import { IExistingCustomer } from './google-contacts.existing-index';
import { buildCustomerFromContact } from './google-contacts.customer-factory';
import { IMappedContact } from './google-contacts.mapper';

const UNIQ_NAME_ATTEMPTS: number = 5;

@Injectable()
export class GoogleContactsCustomersRepository {
	//#region Constructor

	constructor(
		@InjectModel(schemasName.customer)
		private readonly _customerModel: Model<Customer>,
	) {}

	//#endregion

	//#region Public Methods

	/**
	 * Customers that already match any of these contacts, by the link to the
	 * provider's contact or by e-mail (ignoring case). One query for the list.
	 */
	public async findExisting(
		ownerUserId: string,
		appId: AppsEnum.App,
		externalIds: string[],
		emails: string[],
	): Promise<IExistingCustomer[]> {
		return await this._customerModel
			.find(
				{
					ownerUserId,
					$or: [
						{
							externalSources: {
								$elemMatch: { appId, externalId: { $in: externalIds } },
							},
						},
						{ email: { $in: emails } },
					],
				},
				{ email: 1, externalSources: 1 },
			)
			.collation({ locale: 'en', strength: 2 })
			.lean<IExistingCustomer[]>();
	}

	/**
	 * Adds the app as a source of an existing customer and touches nothing else.
	 * A customer holds one source per app, so it is a no-op (false) when the
	 * customer already has this app.
	 */
	public async linkExternalSource(
		customerId: string,
		appId: AppsEnum.App,
		externalId: string,
	): Promise<boolean> {
		const result = await this._customerModel.updateOne(
			{ _id: customerId, 'externalSources.appId': { $ne: appId } },
			{
				$push: { externalSources: { appId, externalId } },
				$set: { updatedAt: new Date() },
			},
		);

		return result.modifiedCount > 0;
	}

	/** A customer of this owner, or null: a malformed or foreign id never reaches the database as a cast error. */
	public async findOwned(
		ownerUserId: string,
		customerId: string,
	): Promise<{ _id: string; name: string | null } | null> {
		if (!mongoose.isValidObjectId(customerId)) {
			return null;
		}

		return await this._customerModel
			.findOne({ _id: customerId, ownerUserId }, { name: 1 })
			.lean<{ _id: string; name: string | null }>();
	}

	/** The customer that holds this provider contact, if any. */
	public async findByExternalId(
		ownerUserId: string,
		appId: AppsEnum.App,
		externalId: string,
	): Promise<{ _id: string; name: string | null } | null> {
		return await this._customerModel
			.findOne(
				{
					ownerUserId,
					externalSources: { $elemMatch: { appId, externalId } },
				},
				{ name: 1 },
			)
			.lean<{ _id: string; name: string | null }>();
	}

	public async create(
		ownerUserId: string,
		appId: AppsEnum.App,
		contact: IMappedContact,
	): Promise<ICustomer> {
		return await this._customerModel.create(
			buildCustomerFromContact(
				ownerUserId,
				appId,
				contact,
				await this._freeUniqName(ownerUserId, contact.name),
			),
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

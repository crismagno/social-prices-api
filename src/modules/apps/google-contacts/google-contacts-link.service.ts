import { Injectable } from '@nestjs/common';

import AppsEnum from '../interfaces/apps.enum';
import { GoogleContactsCustomersRepository } from './google-contacts.customers.repository';
import {
	GoogleContactsContactAlreadyLinkedException,
	GoogleContactsCustomerAlreadyLinkedException,
	GoogleContactsCustomerNotFoundException,
} from './google-contacts.exceptions';

const APP_ID: AppsEnum.App = AppsEnum.App.GOOGLE_CONTACTS;
const DUPLICATE_KEY_CODE: number = 11000;

/** Ties one Google contact to one customer by hand, and finds the customer a contact is tied to. */
@Injectable()
export class GoogleContactsLinkService {
	constructor(
		private readonly _customersRepository: GoogleContactsCustomersRepository,
	) {}

	/**
	 * The user picked the customer for this contact. Only the link is written:
	 * nothing else on the customer changes, as with saving from the grid.
	 */
	public async linkContact(
		ownerUserId: string,
		externalId: string,
		customerId: string,
	): Promise<{ customerId: string; customerName: string | null }> {
		const customer = await this._customersRepository.findOwned(
			ownerUserId,
			customerId,
		);

		if (!customer) {
			throw new GoogleContactsCustomerNotFoundException();
		}

		let linked: boolean;

		try {
			linked = await this._customersRepository.linkExternalSource(
				customerId,
				APP_ID,
				externalId,
			);
		} catch (error) {
			// The contact is already on another customer: the index allows it on one only.
			if ((error as { code?: number })?.code === DUPLICATE_KEY_CODE) {
				throw new GoogleContactsContactAlreadyLinkedException();
			}

			throw error;
		}

		if (!linked) {
			throw new GoogleContactsCustomerAlreadyLinkedException();
		}

		return { customerId, customerName: customer.name };
	}

	/** Lets the grid open the customer of a contact it listed before customers were known. */
	public async findCustomerOf(
		ownerUserId: string,
		externalId: string,
	): Promise<{ customerId: string | null }> {
		const customer = await this._customersRepository.findByExternalId(
			ownerUserId,
			APP_ID,
			externalId,
		);

		return { customerId: customer ? String(customer._id) : null };
	}
}

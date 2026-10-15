import { Injectable, Logger } from '@nestjs/common';

import { FeatureLimitReachedException } from '../../../feature-limits/feature-limit-reached.exception';
import { FeatureLimitsService } from '../../../feature-limits/feature-limits.service';
import FeatureLimitsEnum from '../../../feature-limits/interfaces/feature-limits.enum';
import { AppConnectionsService } from '../../connections/app-connections.service';
import AppsEnum from '../../interfaces/apps.enum';
import {
	IAppImportResponse,
	IAppImportResult,
} from '../../interfaces/apps.types';
import { GoogleAccessTokenProvider } from './google-contacts.access-token';
import { GooglePeopleClient } from './google-contacts.client';
import {
	ExistingCustomersIndex,
	IExistingCustomer,
} from './google-contacts.existing-index';
import { GoogleContactsCustomersRepository } from './google-contacts.customers.repository';
import {
	IMappedContact,
	mapGooglePersonToContact,
} from './google-contacts.mapper';

const APP_ID: AppsEnum.App = AppsEnum.App.GOOGLE_CONTACTS;

/**
 * Saves the contacts the user picked: creates a customer for those that have
 * none, and for those whose customer exists only records this app as a source.
 * Nothing else on an existing customer is ever changed.
 */
@Injectable()
export class GoogleContactsImportService {
	private readonly _logger: Logger = new Logger(
		GoogleContactsImportService.name,
	);

	//#region Constructor

	constructor(
		private readonly _tokenProvider: GoogleAccessTokenProvider,
		private readonly _peopleClient: GooglePeopleClient,
		private readonly _customersRepository: GoogleContactsCustomersRepository,
		private readonly _featureLimitsService: FeatureLimitsService,
		private readonly _connectionsService: AppConnectionsService,
	) {}

	//#endregion

	//#region Public Methods

	public async importSelected(
		ownerUserId: string,
		externalIds: string[],
	): Promise<IAppImportResponse> {
		const ids: string[] = [...new Set(externalIds)];

		const summary: IAppImportResult = {
			created: 0,
			linked: 0,
			skipped: 0,
			failed: 0,
			limitReached: false,
			finishedAt: new Date(),
		};

		const savedExternalIds: string[] = [];

		if (!ids.length) {
			return { ...summary, savedExternalIds };
		}

		const { connection, accessToken } =
			await this._tokenProvider.forOwner(ownerUserId);

		// Re-read from Google: the browser only says which ones, never what.
		const contacts: IMappedContact[] = (
			await this._peopleClient.getByResourceNames(accessToken, ids)
		)
			.map(mapGooglePersonToContact)
			.filter((contact: IMappedContact | null) => !!contact);

		summary.skipped += ids.length - contacts.length;

		const existingCustomers: IExistingCustomer[] =
			await this._customersRepository.findExisting(
				ownerUserId,
				APP_ID,
				contacts.map((contact: IMappedContact) => contact.externalId),
				contacts
					.map((contact: IMappedContact) => contact.email)
					.filter((email: string | null): email is string => !!email),
			);

		// Ask for the whole amount first. Past the limit nothing is saved, not
		// even the links, so the user fixes the selection instead of getting half.
		const newCustomers: number = this._countNewCustomers(
			contacts,
			existingCustomers,
		);

		if (newCustomers > 0) {
			await this._featureLimitsService.assertCanCreate(
				ownerUserId,
				FeatureLimitsEnum.Feature.CUSTOMERS,
				newCustomers,
			);
		}

		const index = new ExistingCustomersIndex(existingCustomers, APP_ID);

		for (const contact of contacts) {
			const match = index.match(contact);

			try {
				if (match?.linked) {
					summary.skipped++;
				} else if (match) {
					// The customer exists: only record this app as one of its sources.
					if (
						await this._customersRepository.linkExternalSource(
							match.customerId,
							APP_ID,
							contact.externalId,
						)
					) {
						summary.linked++;
						savedExternalIds.push(contact.externalId);
						index.register(match.customerId, contact);
					} else {
						summary.skipped++;
					}
				} else if (summary.limitReached) {
					summary.skipped++;
				} else {
					await this._featureLimitsService.assertCanCreate(
						ownerUserId,
						FeatureLimitsEnum.Feature.CUSTOMERS,
					);

					const created = await this._customersRepository.create(
						ownerUserId,
						APP_ID,
						contact,
					);

					summary.created++;
					savedExternalIds.push(contact.externalId);
					index.register(created._id, contact);
				}
			} catch (error) {
				if (error instanceof FeatureLimitReachedException) {
					summary.limitReached = true;
					summary.skipped++;
					continue;
				}

				summary.failed++;
				this._logger.warn(
					`Failed to import ${contact.externalId}: ${(error as Error)
						?.message}`,
				);
			}
		}

		summary.finishedAt = new Date();

		await this._connectionsService.saveSyncResult(connection._id, summary);

		return { ...summary, savedExternalIds };
	}

	//#endregion

	//#region Private Methods

	/**
	 * How many customers this selection would create. Contacts that match a
	 * customer only get linked, and two selected contacts with the same e-mail
	 * make one customer, so neither counts against the limit.
	 */
	private _countNewCustomers(
		contacts: IMappedContact[],
		existingCustomers: IExistingCustomer[],
	): number {
		const planned = new ExistingCustomersIndex(existingCustomers, APP_ID);

		let count: number = 0;

		for (const contact of contacts) {
			if (!planned.match(contact)) {
				count++;
				planned.register('planned', contact);
			}
		}

		return count;
	}

	//#endregion
}

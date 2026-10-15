import { Injectable } from '@nestjs/common';

import AppsEnum from '../../interfaces/apps.enum';
import {
	IAppContactRow,
	IAppSyncPreview,
} from '../../interfaces/apps.types';
import { GoogleAccessTokenProvider } from './google-contacts.access-token';
import { GooglePeopleClient } from './google-contacts.client';
import {
	GoogleContactsCustomersRepository,
} from './google-contacts.customers.repository';
import { ExistingCustomersIndex } from './google-contacts.existing-index';
import {
	IMappedContact,
	mapGooglePersonToContact,
} from './google-contacts.mapper';
import { IGoogleConnectionsPage } from './google-contacts.types';

export const MAX_CONTACTS_LISTED: number = 2000;
const APP_ID: AppsEnum.App = AppsEnum.App.GOOGLE_CONTACTS;

/** Lists the user's Google contacts and where each stands against the customers. Saves nothing. */
@Injectable()
export class GoogleContactsPreviewService {
	//#region Constructor

	constructor(
		private readonly _tokenProvider: GoogleAccessTokenProvider,
		private readonly _peopleClient: GooglePeopleClient,
		private readonly _customersRepository: GoogleContactsCustomersRepository,
	) {}

	//#endregion

	//#region Public Methods

	public async preview(ownerUserId: string): Promise<IAppSyncPreview> {
		const { accessToken } = await this._tokenProvider.forOwner(ownerUserId);

		let contacts: IMappedContact[] = [];
		let pageToken: string | null = null;
		let hasMore: boolean = false;

		do {
			const page: IGoogleConnectionsPage =
				await this._peopleClient.listConnections(accessToken, { pageToken });

			for (const person of page.connections) {
				const contact: IMappedContact | null = mapGooglePersonToContact(person);

				if (contact) {
					contacts.push(contact);
				}
			}

			pageToken = page.nextPageToken;

			if (pageToken && contacts.length >= MAX_CONTACTS_LISTED) {
				hasMore = true;
				break;
			}
		} while (pageToken);

		if (contacts.length > MAX_CONTACTS_LISTED) {
			contacts = contacts.slice(0, MAX_CONTACTS_LISTED);
			hasMore = true;
		}

		const index = new ExistingCustomersIndex(
			await this._customersRepository.findExisting(
				ownerUserId,
				APP_ID,
				contacts.map((contact: IMappedContact) => contact.externalId),
				contacts
					.map((contact: IMappedContact) => contact.email)
					.filter((email: string | null): email is string => !!email),
			),
			APP_ID,
		);

		const rows: IAppContactRow[] = contacts
			.map((contact: IMappedContact) => {
				const match = index.match(contact);

				return {
					externalId: contact.externalId,
					name: contact.name,
					email: contact.email,
					phone: contact.phoneNumbers[0]?.number ?? null,
					status: !match
						? AppsEnum.ContactStatus.NEW
						: match.linked
						? AppsEnum.ContactStatus.LINKED
						: AppsEnum.ContactStatus.EXISTING,
				};
			})
			.sort((a: IAppContactRow, b: IAppContactRow) =>
				a.name.localeCompare(b.name),
			);

		return { contacts: rows, hasMore };
	}

	//#endregion
}

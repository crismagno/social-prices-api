import { Injectable } from '@nestjs/common';

import {
	GooglePeopleApiError,
	IGoogleConnectionsPage,
	IGooglePerson,
} from './google-contacts.types';

const CONNECTIONS_URL: string =
	'https://people.googleapis.com/v1/people/me/connections';
const BATCH_GET_URL: string =
	'https://people.googleapis.com/v1/people:batchGet';
const PERSON_FIELDS: string =
	'names,emailAddresses,phoneNumbers,birthdays,biographies,metadata';
export const PEOPLE_PAGE_SIZE: number = 1000;
export const PEOPLE_BATCH_SIZE: number = 200;

@Injectable()
export class GooglePeopleClient {
	//#region Public Methods

	public async listConnections(
		accessToken: string,
		opts: { pageToken?: string | null },
	): Promise<IGoogleConnectionsPage> {
		const params: URLSearchParams = new URLSearchParams({
			personFields: PERSON_FIELDS,
			pageSize: String(PEOPLE_PAGE_SIZE),
		});

		if (opts.pageToken) {
			params.set('pageToken', opts.pageToken);
		}

		const body: any = await this._get(
			`${CONNECTIONS_URL}?${params}`,
			accessToken,
		);

		return {
			connections: body.connections ?? [],
			nextPageToken: body.nextPageToken ?? null,
		};
	}

	/** People API allows 200 names per request; the rest is split here. */
	public async getByResourceNames(
		accessToken: string,
		resourceNames: string[],
	): Promise<IGooglePerson[]> {
		const people: IGooglePerson[] = [];

		for (let i = 0; i < resourceNames.length; i += PEOPLE_BATCH_SIZE) {
			const params: URLSearchParams = new URLSearchParams({
				personFields: PERSON_FIELDS,
			});

			for (const name of resourceNames.slice(i, i + PEOPLE_BATCH_SIZE)) {
				params.append('resourceNames', name);
			}

			const body: any = await this._get(
				`${BATCH_GET_URL}?${params}`,
				accessToken,
			);

			for (const item of body.responses ?? []) {
				if (item?.person) {
					people.push(item.person);
				}
			}
		}

		return people;
	}

	//#endregion

	//#region Private Methods

	private async _get(url: string, accessToken: string): Promise<any> {
		const response: Response = await fetch(url, {
			headers: { Authorization: `Bearer ${accessToken}` },
		});

		const body: any = await response.json();

		if (!response.ok) {
			const details: any[] = body?.error?.details ?? [];

			throw new GooglePeopleApiError(
				response.status,
				details.find((detail: any) => detail?.reason)?.reason ??
					body?.error?.status ??
					'',
				body?.error?.message ?? '',
			);
		}

		return body;
	}

	//#endregion
}

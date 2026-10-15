import { IExternalSource } from '../../../customers/interfaces/customer.interface';
import AppsEnum from '../../interfaces/apps.enum';

export interface IExistingCustomer {
	_id: string;
	email: string | null;
	externalSources?: IExternalSource[];
}

export interface IContactKeys {
	externalId: string;
	email: string | null;
}

export interface IContactMatch {
	customerId: string;
	/** True when the customer already has this app as a source. */
	linked: boolean;
}

/**
 * Looks contacts up among the user's existing customers: first by the link to
 * the provider's contact, then by e-mail (ignoring case). Shared by the preview
 * (what the grid shows) and the import (what gets done) so they cannot disagree.
 */
export class ExistingCustomersIndex {
	private readonly _byExternalId: Map<string, string> = new Map();
	private readonly _byEmail: Map<string, IContactMatch> = new Map();

	constructor(
		customers: IExistingCustomer[],
		private readonly _appId: AppsEnum.App,
	) {
		for (const customer of customers) {
			const sources: IExternalSource[] = customer.externalSources ?? [];
			const linked: boolean = sources.some(
				(source: IExternalSource) => source.appId === _appId,
			);

			for (const source of sources) {
				if (source.appId === _appId) {
					this._byExternalId.set(source.externalId, customer._id);
				}
			}

			if (customer.email) {
				this._byEmail.set(customer.email.toLowerCase(), {
					customerId: customer._id,
					linked,
				});
			}
		}
	}

	public match(contact: IContactKeys): IContactMatch | null {
		const customerId: string | undefined = this._byExternalId.get(
			contact.externalId,
		);

		if (customerId) {
			return { customerId, linked: true };
		}

		return contact.email
			? this._byEmail.get(contact.email.toLowerCase()) ?? null
			: null;
	}

	/** After creating or linking, later contacts in the same batch must see it. */
	public register(customerId: string, contact: IContactKeys): void {
		this._byExternalId.set(contact.externalId, customerId);

		if (contact.email) {
			this._byEmail.set(contact.email.toLowerCase(), {
				customerId,
				linked: true,
			});
		}
	}
}

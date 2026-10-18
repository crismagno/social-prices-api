namespace GoogleContactsEnum {
	/**
	 * Where a Google contact stands against the user's customers: no customer
	 * yet, a customer that does not have Google Contacts as a source yet, or a
	 * customer that already has it.
	 */
	export enum ContactStatus {
		NEW = 'NEW',
		EXISTING = 'EXISTING',
		LINKED = 'LINKED',
	}
}

export default GoogleContactsEnum;

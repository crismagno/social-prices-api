namespace AppsEnum {
	export enum App {
		GOOGLE_CONTACTS = 'GOOGLE_CONTACTS',
		INSTAGRAM = 'INSTAGRAM',
		FACEBOOK = 'FACEBOOK',
		WHATSAPP = 'WHATSAPP',
		TELEGRAM = 'TELEGRAM',
	}

	export enum ConnectionStatus {
		CONNECTED = 'CONNECTED',
		EXPIRED = 'EXPIRED',
		REVOKED = 'REVOKED',
	}

	/**
	 * Where a provider contact stands against the user's customers: no customer
	 * yet, a customer that does not have this app as a source yet, or a customer
	 * that already has it.
	 */
	export enum ContactStatus {
		NEW = 'NEW',
		EXISTING = 'EXISTING',
		LINKED = 'LINKED',
	}

	export const AppLabels = {
		[App.GOOGLE_CONTACTS]: 'Google Contacts',
		[App.INSTAGRAM]: 'Instagram',
		[App.FACEBOOK]: 'Facebook',
		[App.WHATSAPP]: 'WhatsApp',
		[App.TELEGRAM]: 'Telegram',
	};

	export const ConnectionStatusLabels = {
		[ConnectionStatus.CONNECTED]: 'Connected',
		[ConnectionStatus.EXPIRED]: 'Expired',
		[ConnectionStatus.REVOKED]: 'Revoked',
	};
}

export default AppsEnum;

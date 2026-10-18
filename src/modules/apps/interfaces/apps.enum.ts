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

namespace SalesEnum {
	export enum Type {
		MANUAL = 'MANUAL',
		SHOPPING = 'SHOPPING',
		AUTOMATIC = 'AUTOMATIC',
	}

	export enum PaymentType {
		PIX = 'PIX',
		CASH = 'CASH',
		CARD = 'CARD',
		SPUN = 'SPUN',
	}

	export enum PaymentStatus {
		COMPLETED = 'COMPLETED',
		WAITING_PAYMENT = 'WAITING_PAYMENT',
		REFUNDED = 'REFUNDED',
	}

	export enum Status {
		STARTED = 'STARTED',
		STOPPED = 'STOPPED',
		ERROR = 'ERROR',
		COMPLETED = 'COMPLETED',
		WAITING_PAYMENT = 'WAITING_PAYMENT',
		REFUNDED = 'REFUNDED',
	}
}

export default SalesEnum;

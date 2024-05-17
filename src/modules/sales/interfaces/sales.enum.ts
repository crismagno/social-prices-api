namespace SalesEnum {
	export enum Type {
		MANUAL = 'MANUAL',
		SHOPPING = 'SHOPPING',
	}

	export enum DeliveryType {
		PICKUP = 'PICKUP',
		DELIVERY = 'DELIVERY',
	}

	export enum PaymentType {
		PIX = 'PIX',
		CASH = 'CASH',
		CARD = 'CARD',
	}

	export enum PaymentStatus {
		COMPLETED = 'COMPLETED',
		PENDING = 'PENDING',
		PARTIALLY = 'PARTIALLY',
		CANCELLED = 'CANCELLED',
		REFUNDED = 'REFUNDED',
	}

	export enum Status {
		STARTED = 'STARTED',
		CANCELLED = 'CANCELLED',
		STOPPED = 'STOPPED',
		ERROR = 'ERROR',
		COMPLETED = 'COMPLETED',
		PROCESSING = 'PROCESSING',
		PENDING = 'PENDING',
		REFUNDED = 'REFUNDED',
	}
}

export default SalesEnum;

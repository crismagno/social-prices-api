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
		OTHER = 'OTHER',
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

	export const StatusLabels = {
		[Status.STARTED]: 'Started',
		[Status.CANCELLED]: 'Cancelled',
		[Status.STOPPED]: 'Stopped',
		[Status.ERROR]: 'Error',
		[Status.COMPLETED]: 'Completed',
		[Status.PROCESSING]: 'Processing',
		[Status.PENDING]: 'Pending',
		[Status.REFUNDED]: 'Refunded',
	};

	export enum SortField {
		deliveryAt = 'deliveryAt',
		createdAt = 'createdAt',
		createdDate = 'createdDate',
	}

	export const PaymentTypeLabels = {
		[PaymentType.PIX]: 'PIX',
		[PaymentType.CASH]: 'Cash',
		[PaymentType.CARD]: 'Card',
		[PaymentType.OTHER]: 'Other',
	};

	export const PaymentStatusLabels = {
		[PaymentStatus.COMPLETED]: 'Completed',
		[PaymentStatus.PENDING]: 'Pending',
		[PaymentStatus.PARTIALLY]: 'Partially',
		[PaymentStatus.CANCELLED]: 'Cancelled',
		[PaymentStatus.REFUNDED]: 'Refunded',
	};

	export const DeliveryTypeLabels = {
		[DeliveryType.PICKUP]: 'Pickup',
		[DeliveryType.DELIVERY]: 'Delivery',
	};

	export const StatusToFilterCharts: Status[] = [
		Status.STARTED,
		Status.PROCESSING,
		Status.COMPLETED,
		Status.STOPPED,
	];
}

export default SalesEnum;

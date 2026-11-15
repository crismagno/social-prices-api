import { ISale } from '../../sales/interfaces/sale.interface';

/** Who the customer is, as the token says: their sales are matched by either. */
export interface ICustomerPortalBuyer {
	userId: string;
	email: string;
}

/** A sale as the customer sees it, with the names of its stores and products. */
export type ICustomerPortalSale = ISale & {
	storesNames: Record<string, string>;
	productsNames: Record<string, string>;
	/** The main picture of each product, when it has one. */
	productsImages: Record<string, string | null>;
};

export interface ICustomerPortalDashboard {
	totalPurchases: number;
	/** Completed sales only. */
	totalSpent: number;
	/** What is still to pay on sales not fully paid, cancelled and refunded ones aside. */
	openAmount: number;
	lastPurchases: ICustomerPortalSale[];
}

/** A store the customer bought in: only its name is shown. */
export interface ICustomerPortalStore {
	_id: string;
	name: string;
}

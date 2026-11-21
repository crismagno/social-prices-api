/**
 * What the owner informs to price a product. It is informational: the sale
 * price stays in `price` and is never derived from these numbers by the API.
 */
export interface IPricing {
	cost: number | null;
	variableExpensesPercentage: number | null;
	fixedExpensesPercentage: number | null;
	profitPercentage: number | null;
}

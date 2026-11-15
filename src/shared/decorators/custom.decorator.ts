import { CustomDecorator, SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY: string = 'isPublic';
export const Public = (): CustomDecorator<string> =>
	SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Marks a route as belonging to the manager panel. The global AuthGuard only lets
 * a MANAGER token through on these, and only a USER token through on every other
 * protected route. The separation is by omission: a new sale or product route is
 * closed to manager tokens without anyone having to remember anything.
 */
export const IS_MANAGER_ROUTE_KEY: string = 'isManagerRoute';
export const ManagerRoute = (): CustomDecorator<string> =>
	SetMetadata(IS_MANAGER_ROUTE_KEY, true);

/**
 * Only for the route that redeems the sign in code. A manager token is issued
 * before the emailed code is checked, and is refused everywhere until it is.
 */
export const ALLOWS_UNVALIDATED_SIGN_IN_KEY: string = 'allowsUnvalidatedSignIn';
export const AllowsUnvalidatedSignIn = (): CustomDecorator<string> =>
	SetMetadata(ALLOWS_UNVALIDATED_SIGN_IN_KEY, true);

/**
 * Opens a route to CUSTOMER accounts. Every other protected route refuses them,
 * so a new store route is closed to customers without anyone remembering to.
 */
export const IS_ALLOW_CUSTOMER_KEY: string = 'isAllowCustomer';
export const AllowCustomer = (): CustomDecorator<string> =>
	SetMetadata(IS_ALLOW_CUSTOMER_KEY, true);

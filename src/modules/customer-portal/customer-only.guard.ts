import {
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Injectable,
} from '@nestjs/common';

import AuthEnum from '../auth/interfaces/auth.enum';
import { IAuthPayload } from '../auth/interfaces/auth.types';
import UsersEnum from '../users/interfaces/users.enum';

/**
 * The customer portal shows the purchases made for whoever signed in: a
 * CUSTOMER account, or the owner of a COMPANY looking at their own purchases.
 * A company's employees have no purchases of their own here.
 */
@Injectable()
export class CustomerOnlyGuard implements CanActivate {
	public canActivate(context: ExecutionContext): boolean {
		const payload: IAuthPayload | undefined = context
			.switchToHttp()
			.getRequest()[AuthEnum.RequestProps.AUTH_PAYLOAD];

		const isCustomer: boolean = payload?.userType === UsersEnum.Type.CUSTOMER;

		const isCompanyOwner: boolean =
			payload?.userType === UsersEnum.Type.COMPANY && payload?.isOwner === true;

		if (!isCustomer && !isCompanyOwner) {
			throw new ForbiddenException({
				code: 'CUSTOMER_PORTAL_ONLY',
				message:
					'Only customer accounts and company owners can use the customer portal.',
			});
		}

		return true;
	}
}

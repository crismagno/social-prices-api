import { ForbiddenException } from '@nestjs/common';

import AuthEnum from '../auth/interfaces/auth.enum';
import { CustomerOnlyGuard } from './customer-only.guard';

const contextWith = (payload: any): any => ({
	switchToHttp: () => ({
		getRequest: () => ({ [AuthEnum.RequestProps.AUTH_PAYLOAD]: payload }),
	}),
});

describe('CustomerOnlyGuard', () => {
	const guard = new CustomerOnlyGuard();

	it('lets a customer account in', () => {
		expect(guard.canActivate(contextWith({ userType: 'CUSTOMER' }))).toBe(true);
	});

	it('lets the owner of a company in, to see their own purchases', () => {
		expect(
			guard.canActivate(contextWith({ userType: 'COMPANY', isOwner: true })),
		).toBe(true);
	});

	it("refuses a company's employee", () => {
		expect(() =>
			guard.canActivate(contextWith({ userType: 'COMPANY', isOwner: false })),
		).toThrow(ForbiddenException);
	});

	it('refuses an old token that does not say who signed in', () => {
		expect(() => guard.canActivate(contextWith({}))).toThrow(
			ForbiddenException,
		);
	});
});

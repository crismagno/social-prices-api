import UsersEnum from '../users/interfaces/users.enum';
import { AuthService } from './auth.service';

const COMPANY_USER: any = {
	_id: 'u1',
	uid: 'uid',
	email: 'ana@x.com',
	type: UsersEnum.Type.COMPANY,
};

const build = (employee: any, user: any = COMPANY_USER) => {
	const users: any = {
		findOneByIdOrFail: jest.fn().mockResolvedValue(user),
	};
	const employees: any = {
		findByIdOrFail: jest.fn().mockResolvedValue(employee),
		findAdminByUserId: jest.fn().mockResolvedValue(employee),
	};
	const token: any = { generateToken: jest.fn().mockResolvedValue('TOKEN') };

	return {
		token,
		service: new AuthService(
			users,
			{} as any,
			{} as any,
			token,
			employees,
			{} as any,
			{} as any,
		),
	};
};

const payloadOf = (token: any): any => token.generateToken.mock.calls[0][0];

describe('AuthService — what a token says about who signed in', () => {
	it("carries the account's type as it is", async () => {
		const customer = { ...COMPANY_USER, type: UsersEnum.Type.CUSTOMER };
		const { service, token } = build({ _id: 'e1', isMain: true }, customer);

		await service.getAuthLogin(customer);

		expect(payloadOf(token).userType).toBe(UsersEnum.Type.CUSTOMER);
	});

	it('marks the owner, who may also look at their own purchases', async () => {
		const { service, token } = build({ _id: 'e1', isMain: true });

		await service.getAuthLogin(COMPANY_USER);

		expect(payloadOf(token)).toEqual(
			expect.objectContaining({
				userType: UsersEnum.Type.COMPANY,
				isOwner: true,
			}),
		);
	});

	it('does not mark an employee as the owner', async () => {
		const { service, token } = build({ _id: 'e2', isMain: false });

		await service.getAuthLogin(COMPANY_USER, 'e2');

		expect(payloadOf(token).isOwner).toBe(false);
	});

	it('keeps the owner mark when signing in again by token', async () => {
		const { service, token } = build({ _id: 'e1', isMain: true });

		await service.getAuthLoginByToken('u1', 'e1');

		expect(payloadOf(token).isOwner).toBe(true);
	});
});

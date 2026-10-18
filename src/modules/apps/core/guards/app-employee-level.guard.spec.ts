import { ForbiddenException } from '@nestjs/common';

import AuthEnum from '../../../auth/interfaces/auth.enum';
import EmployeesEnum from '../../../employees/interfaces/employees.enum';
import { AppEmployeeLevelGuard } from './app-employee-level.guard';

const contextFor = (payload: any): any => ({
	switchToHttp: () => ({
		getRequest: () => ({ [AuthEnum.RequestProps.AUTH_PAYLOAD]: payload }),
	}),
});

const buildGuard = (employee: any) =>
	new AppEmployeeLevelGuard({
		findById: jest.fn().mockResolvedValue(employee),
	} as any);

describe('AppEmployeeLevelGuard', () => {
	it('lets the owner user (no employee) through', async () => {
		await expect(
			buildGuard(null).canActivate(contextFor({ _id: 'u1' })),
		).resolves.toBe(true);
	});

	it.each([EmployeesEnum.Level.ADMIN, EmployeesEnum.Level.MASTER])(
		'lets a %s employee through',
		async (level) => {
			await expect(
				buildGuard({ level }).canActivate(
					contextFor({ _id: 'u1', employeeId: 'e1' }),
				),
			).resolves.toBe(true);
		},
	);

	it('refuses an EMPLOYEE-level employee', async () => {
		await expect(
			buildGuard({ level: EmployeesEnum.Level.EMPLOYEE }).canActivate(
				contextFor({ _id: 'u1', employeeId: 'e1' }),
			),
		).rejects.toBeInstanceOf(ForbiddenException);
	});

	it('refuses when the employee no longer exists', async () => {
		await expect(
			buildGuard(null).canActivate(contextFor({ _id: 'u1', employeeId: 'e1' })),
		).rejects.toBeInstanceOf(ForbiddenException);
	});
});

import 'reflect-metadata';

import { MANAGER_LEVELS_KEY } from '../manager-auth/guards/manager-level.guard';
import ManagersEnum from '../managers/interfaces/managers.enum';
import { ManagerUsersController } from './manager-users.controller';

describe('ManagerUsersController levels', () => {
	const levelsOf = (method: keyof ManagerUsersController): string[] =>
		Reflect.getMetadata(
			MANAGER_LEVELS_KEY,
			ManagerUsersController.prototype[method],
		);

	it.each(['update', 'updateLimits'] as const)(
		'%s excludes SUB_MANAGER',
		(method) => {
			expect(levelsOf(method)).toEqual([
				ManagersEnum.Level.ADMIN,
				ManagersEnum.Level.MANAGER,
			]);
			expect(levelsOf(method)).not.toContain(ManagersEnum.Level.SUB_MANAGER);
		},
	);

	it('reads stay open to every level', () => {
		expect(levelsOf('findById')).toBeUndefined();
	});
});

import 'reflect-metadata';

import { MANAGER_LEVELS_KEY } from '../manager-auth/guards/manager-level.guard';
import ManagersEnum from '../managers/interfaces/managers.enum';
import { ManagerFeedbacksController } from './manager-feedbacks.controller';

describe('ManagerFeedbacksController levels', () => {
	const levelsOf = (method: keyof ManagerFeedbacksController): string[] =>
		Reflect.getMetadata(
			MANAGER_LEVELS_KEY,
			ManagerFeedbacksController.prototype[method],
		);

	it('updateStatus is limited to ADMIN and MANAGER', () => {
		expect(levelsOf('updateStatus')).toEqual([
			ManagersEnum.Level.ADMIN,
			ManagersEnum.Level.MANAGER,
		]);
		expect(levelsOf('updateStatus')).not.toContain(
			ManagersEnum.Level.SUB_MANAGER,
		);
	});

	it('reads stay open to every manager level', () => {
		expect(levelsOf('findByTableState')).toBeUndefined();
		expect(levelsOf('findById')).toBeUndefined();
	});
});

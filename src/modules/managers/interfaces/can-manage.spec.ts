import { canManage } from './can-manage';
import ManagersEnum from './managers.enum';

describe('canManage', () => {
	const { ADMIN, MANAGER, SUB_MANAGER } = ManagersEnum.Level;

	it.each`
		actor          | target         | expected
		${ADMIN}       | ${ADMIN}       | ${true}
		${ADMIN}       | ${MANAGER}     | ${true}
		${ADMIN}       | ${SUB_MANAGER} | ${true}
		${MANAGER}     | ${ADMIN}       | ${false}
		${MANAGER}     | ${MANAGER}     | ${false}
		${MANAGER}     | ${SUB_MANAGER} | ${true}
		${SUB_MANAGER} | ${ADMIN}       | ${false}
		${SUB_MANAGER} | ${MANAGER}     | ${false}
		${SUB_MANAGER} | ${SUB_MANAGER} | ${false}
	`('$actor managing $target is $expected', ({ actor, target, expected }) => {
		expect(canManage(actor, target)).toBe(expected);
	});
});

import ManagersEnum from './managers.enum';

const LEVEL_WEIGHT: Record<ManagersEnum.Level, number> = {
	[ManagersEnum.Level.ADMIN]: 3,
	[ManagersEnum.Level.MANAGER]: 2,
	[ManagersEnum.Level.SUB_MANAGER]: 1,
};

/**
 * Whether a manager at `actorLevel` may create, edit, deactivate or delete a
 * manager at `targetLevel`. ADMIN reaches every level, including its peers.
 * MANAGER reaches only levels strictly below MANAGER. SUB_MANAGER reaches none.
 *
 * This is the coarse rule only. The absolute locks — the main manager cannot be
 * deleted, deactivated or downgraded, and nobody deletes or deactivates their own
 * account — live in ManagersService, because they need the loaded record.
 */
export const canManage = (
	actorLevel: ManagersEnum.Level,
	targetLevel: ManagersEnum.Level,
): boolean => {
	if (actorLevel === ManagersEnum.Level.ADMIN) {
		return true;
	}

	if (actorLevel === ManagersEnum.Level.MANAGER) {
		return LEVEL_WEIGHT[targetLevel] < LEVEL_WEIGHT[ManagersEnum.Level.MANAGER];
	}

	return false;
};

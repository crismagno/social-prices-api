import { ForbiddenException } from '@nestjs/common';

import { IManager } from './manager.interface';

/**
 * Refuses a manager account that was soft deleted or deactivated. Shared by the
 * sign in flow and by ManagerLevelGuard, which re-checks it on every manager request
 * so that deleting or deactivating a manager takes effect immediately instead of
 * when their token expires.
 */
export const assertManagerUsable = (manager: IManager): void => {
	if (manager.softDelete?.isDeleted) {
		throw new ForbiddenException(
			'Account removed. Please contact the main manager.',
		);
	}

	if (!manager.isActive) {
		throw new ForbiddenException(
			'Account inactive. Please contact the main manager.',
		);
	}
};

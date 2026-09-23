import {
	CanActivate,
	CustomDecorator,
	ExecutionContext,
	ForbiddenException,
	Injectable,
	SetMetadata,
	UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import AuthEnum from '../../auth/interfaces/auth.enum';
import { assertManagerUsable } from '../../managers/interfaces/assert-manager-usable';
import { IManager } from '../../managers/interfaces/manager.interface';
import ManagersEnum from '../../managers/interfaces/managers.enum';
import { ManagersService } from '../../managers/managers.service';
import { IManagerAuthPayload } from '../interfaces/manager-auth.types';

export const MANAGER_LEVELS_KEY: string = 'managerLevels';

/**
 * Coarse rule only: which levels may reach this route at all. The fine rule —
 * canManage against the target record, plus the main-manager and self locks —
 * lives in ManagersService, because it needs the record loaded.
 */
export const ManagerLevels = (
	...levels: ManagersEnum.Level[]
): CustomDecorator<string> => SetMetadata(MANAGER_LEVELS_KEY, levels);

/**
 * Runs after the global AuthGuard on every manager panel controller, and does two
 * things:
 *
 * 1. Re-loads the acting manager from the database and refuses the request if the
 *    account no longer exists, was soft deleted or was deactivated. It then
 *    overwrites `level` and `isMain` on the request payload with the stored values.
 *    The token is valid for 30 days, and without this a deleted, deactivated or
 *    demoted manager would keep their old powers until it expired.
 * 2. Applies the coarse @ManagerLevels rule against that fresh level.
 */
@Injectable()
export class ManagerLevelGuard implements CanActivate {
	//#region Constructor

	constructor(
		private _reflector: Reflector,
		private _managersService: ManagersService,
	) {}

	//#endregion

	// #region Public Methods

	public async canActivate(context: ExecutionContext): Promise<boolean> {
		const request: any = context.switchToHttp().getRequest();

		const payload: IManagerAuthPayload =
			request[AuthEnum.RequestProps.AUTH_PAYLOAD];

		if (!payload?._id) {
			throw new UnauthorizedException();
		}

		const actor: IManager | null = await this._managersService.findById(
			payload._id,
		);

		if (!actor) {
			throw new UnauthorizedException();
		}

		assertManagerUsable(actor);

		payload.level = actor.level;
		payload.isMain = actor.isMain;

		const levels: ManagersEnum.Level[] = this._reflector.getAllAndOverride<
			ManagersEnum.Level[]
		>(MANAGER_LEVELS_KEY, [context.getHandler(), context.getClass()]);

		if (!levels?.length) {
			return true;
		}

		if (!payload.level || !levels.includes(payload.level)) {
			throw new ForbiddenException(
				'Your manager level cannot perform this action.',
			);
		}

		return true;
	}

	// #endregion
}

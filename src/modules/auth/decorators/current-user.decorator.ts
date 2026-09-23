import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import AuthEnum from '../interfaces/auth.enum';
import { IAuthPayload } from '../interfaces/auth.types';

/**
 * For USER-identity routes only. `IAuthPayload.type` is optional and typed to the
 * single literal `PayloadType.USER`, so it cannot represent a manager payload — a
 * route marked `@ManagerRoute()` must use the manager-specific payload decorator
 * instead once one exists. AuthGuard already guarantees only a USER-shaped payload
 * reaches a non-manager route, so this cast is safe on every route that reads it
 * today, but it would silently lie about the runtime shape if reused on a manager
 * route.
 */
export const AuthPayload = createParamDecorator(
	(data: unknown, context: ExecutionContext) => {
		const request = context.switchToHttp().getRequest<any>();

		const authPayload: IAuthPayload =
			request[AuthEnum.RequestProps.AUTH_PAYLOAD];

		return authPayload;
	},
);

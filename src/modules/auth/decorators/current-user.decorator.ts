import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import AuthEnum from '../interfaces/auth.enum';
import { IAuthPayload } from '../interfaces/auth.types';

export const CurrentUser = createParamDecorator(
	(data: unknown, context: ExecutionContext) => {
		const request = context.switchToHttp().getRequest<any>();

		const authPayload: IAuthPayload =
			request[AuthEnum.RequestProps.AUTH_PAYLOAD];

		return authPayload;
	},
);

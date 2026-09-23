import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import AuthEnum from '../../auth/interfaces/auth.enum';
import { IManagerAuthPayload } from '../interfaces/manager-auth.types';

export const ManagerAuthPayload = createParamDecorator(
	(data: unknown, context: ExecutionContext) => {
		const request = context.switchToHttp().getRequest<any>();

		const managerAuthPayload: IManagerAuthPayload =
			request[AuthEnum.RequestProps.AUTH_PAYLOAD];

		return managerAuthPayload;
	},
);

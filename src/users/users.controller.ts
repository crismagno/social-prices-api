import { Controller, Get, Request } from '@nestjs/common';

import AuthEnum from '../auth/interfaces/auth.enum';
import { IAuthPayload } from '../auth/interfaces/auth.types';
import { IUserEntity } from './interfaces/users.types';
import { UsersService } from './users.service';

@Controller('api/v1/users')
export class UsersController {
	constructor(private _usersService: UsersService) {}

	@Get('/getUser')
	public async getUserEntityByUserId(
		@Request() request: any,
	): Promise<IUserEntity> {
		const authPayload: IAuthPayload =
			request[AuthEnum.RequestProps.AUTH_PAYLOAD];
		return this._usersService.getUserEntityByUserId(authPayload._id);
	}
}

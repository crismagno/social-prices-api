import { Controller, Get } from '@nestjs/common';

import { UsersService } from './users.service';

@Controller('api/v1/users')
export class UsersController {
	constructor(private _usersService: UsersService) {}

	@Get('/test')
	public findOne(): any {
		return 'hey user--';
	}
}

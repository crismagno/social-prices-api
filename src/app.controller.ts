import { Controller, Get, Param, Res } from '@nestjs/common';

import { AppService } from './app.service';
import { Public } from './shared/decorators/custom.decorator';
import { ValidationParamsPipe } from './shared/pipes/validation-params-pipe';
import { CurrentUser } from './modules/auth/decorators/current-user.decorator';
import UserEntity from './modules/users/interfaces/user.entity';

@Controller('api/v1')
export class AppController {
	constructor(private readonly _appService: AppService) { }

	@Public()
	@Get()
	public getHello(): string {
		return this._appService.getHello();
	}

	@Public()
	@Get('/uploads/:filename')
	public getAvatarImage(
		@Res() res: any,
		@Param('filename', ValidationParamsPipe) filename: string,
	) {
		return res.sendFile(filename, {
			root: './uploads',
		});
	}

	@Get('/me')
	getMe(@CurrentUser() user: UserEntity) {
		return user;
	}
}

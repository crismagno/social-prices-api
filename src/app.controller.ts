import { Controller, Get, Param, Res } from '@nestjs/common';

import { AppService } from './app.service';
import { AuthPayload } from './modules/auth/decorators/current-user.decorator';
import UserEntity from './modules/users/interfaces/user.entity';
import { Public } from './shared/decorators/custom.decorator';
import { ValidationParamsPipe } from './shared/pipes/validation-params-pipe';

@Controller('api/v1')
export class AppController {
	constructor(private readonly _appService: AppService) {}

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

	@Public()
	@Get('/assets/images/:filename')
	public getAssetImage(
		@Res() res: any,
		@Param('filename', ValidationParamsPipe) filename: string,
	) {
		return res.sendFile(filename, {
			root: './assets/images',
		});
	}

	@Get('/me')
	public getMe(@AuthPayload() user: UserEntity) {
		return user;
	}

	// @Public()
	// @Get('/webhooks/instagram')
	// public getWebhooksInstagram(@Res() res: Response, @Req() req: Request) {
	// 	console.log('===========Validation Webhook Instagram=============');
	// 	console.log('req.body: ', req.body);
	// 	console.log('req.query: ', req.query);
	// 	console.log('=========================================');
	// 	return res.status(200).send(req.query['hub.challenge']);
	// }

	// @Public()
	// @Post('/webhooks/instagram')
	// public postWebhooksInstagram(@Res() res: Response, @Req() req: Request) {
	// 	console.log('===========Webhook Instagram=============');
	// 	console.log(JSON.stringify(req.body));
	// 	console.log(JSON.stringify(req.query));
	// 	console.log(JSON.stringify(req.params));
	// 	console.log('=========================================');
	// 	return res.status(200).send('ok');
	// }
}

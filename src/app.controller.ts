import { Controller, Get } from '@nestjs/common';

import { AppService } from './app.service';
import { Public } from './shared/decorators/custom.decorator';

@Controller()
export class AppController {
	constructor(private readonly _appService: AppService) {}

	@Public()
	@Get()
	public getHello(): string {
		return this._appService.getHello();
	}
}

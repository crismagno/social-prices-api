import { Controller, Get } from '@nestjs/common';

import { AppService } from './app.service';
import { Public } from './shared/decorators/custom.decorator';

@Controller('')
export class AppInitController {
	constructor(private readonly _appService: AppService) {}

	@Public()
	@Get()
	public getHello(): string {
		return this._appService.getHello();
	}

	@Public()
	@Get('health')
	public getHealth(): string {
		return this._appService.getHealth();
	}
}

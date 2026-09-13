import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
	public getHello(): string {
		return 'Hello World! Date: 12/09/2026';
	}

	public getHealth(): string {
		return 'OK';
	}
}

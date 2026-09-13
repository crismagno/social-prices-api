import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
	public getHello(): string {
		return 'Hello World! Date: 13/09/2026 19:44';
	}

	public getHealth(): string {
		return 'OK';
	}
}

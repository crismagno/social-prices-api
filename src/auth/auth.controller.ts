import {
	Body,
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	Post,
	Request,
} from '@nestjs/common';

import { Public } from '../shared/decorators/custom.decorator';
import { AuthService } from './auth.service';

@Controller('api/v1/auth')
export class AuthController {
	constructor(private _authService: AuthService) {}

	@HttpCode(HttpStatus.OK)
	@Public()
	@Post('/signIn')
	public async signIn(@Body() signInDto: Record<string, string>): Promise<{
		accessToken: string;
	}> {
		return this._authService.signIn(signInDto.username, signInDto.password);
	}

	@Get('/profile')
	public getProfile(@Request() req) {
		return req.user;
	}
}

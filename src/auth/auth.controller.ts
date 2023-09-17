import {
	Body,
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	Post,
	Request,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';

import { Public } from '../shared/decorators/custom.decorator';
import { AuthService } from './auth.service';
import CreateAuthDto from './interfaces/dto/createAuth.dto';

@Controller('api/v1/auth')
export class AuthController {
	constructor(private _authService: AuthService) {}

	@HttpCode(HttpStatus.OK)
	@Public()
	@Post('/signIn')
	@UsePipes(ValidationPipe)
	public async signIn(@Body() signInDto: Record<string, string>): Promise<{
		accessToken: string;
	}> {
		return this._authService.signIn(signInDto.username, signInDto.password);
	}

	@Get('/profile')
	public getProfile(@Request() req) {
		return req.user;
	}

	@Post('/sighUp')
	@UsePipes(ValidationPipe)
	public async sighUp(@Body() createAuthDto: CreateAuthDto) {
		return this._authService.signUp(createAuthDto);
	}
}

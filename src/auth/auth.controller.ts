import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';

import { Public } from '../shared/decorators/custom.decorator';
import CreateUserDto from '../users/interfaces/dto/createUser.dto';
import { IUserEntity } from '../users/interfaces/users.types';
import { AuthService } from './auth.service';

@Controller('api/v1/auth')
export class AuthController {
	constructor(private _authService: AuthService) {}

	@HttpCode(HttpStatus.OK)
	@Public()
	@Post('/signIn')
	@UsePipes(ValidationPipe)
	public async signIn(
		@Body() signInDto: Record<string, string>,
	): Promise<IUserEntity> {
		return this._authService.signIn(signInDto.email, signInDto.password);
	}

	@Post('/signUp')
	@Public()
	@UsePipes(ValidationPipe)
	public async sighUp(
		@Body() createUserDto: CreateUserDto,
	): Promise<IUserEntity> {
		return this._authService.signUp(createUserDto);
	}
}

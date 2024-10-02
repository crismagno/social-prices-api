import {
	Body,
	Controller,
	Get,
	Param,
	Post,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';

import { Public } from '../../shared/decorators/custom.decorator';
import { ValidationParamsPipe } from '../../shared/pipes/validation-params-pipe';
import CreateUserDto from '../users/interfaces/dto/createUser.dto';
import { IUserEntity } from '../users/interfaces/users.types';
import { AuthService } from './auth.service';
import { AuthPayload } from './decorators/current-user.decorator';
import { IAuthPayload } from './interfaces/auth.types';

@Controller('api/v1/auth')
export class AuthController {
	constructor(private _authService: AuthService) {}

	@Public()
	@Post('/signIn')
	@UsePipes(ValidationPipe)
	public async signIn(
		@Body() signInDto: Record<string, string>,
	): Promise<IUserEntity> {
		return await this._authService.signIn(
			signInDto.emailOrUsername,
			signInDto.password,
		);
	}

	@Public()
	@Post('/signUp')
	@UsePipes(ValidationPipe)
	public async signUp(
		@Body() createUserDto: CreateUserDto,
	): Promise<IUserEntity> {
		return await this._authService.signUp(createUserDto);
	}

	@Get('/validateToken')
	@UsePipes(ValidationPipe)
	public async validateToken(): Promise<boolean> {
		return true;
	}

	@Get('/validateSignInCode/:codeValue')
	@UsePipes(ValidationPipe)
	public async validateSignInCode(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('codeValue', ValidationParamsPipe) codeValue: string,
	): Promise<boolean> {
		return await this._authService.validateSignInCode(
			authPayload._id,
			codeValue,
		);
	}
}

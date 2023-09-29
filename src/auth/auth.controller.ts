import {
	Body,
	Controller,
	Get,
	Param,
	Post,
	Request,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';

import { Public } from '../shared/decorators/custom.decorator';
import CreateUserDto from '../users/interfaces/dto/createUser.dto';
import { IUserEntity } from '../users/interfaces/users.types';
import { AuthService } from './auth.service';
import AuthEnum from './interfaces/auth.enum';
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

	@Get('/validateToken')
	@UsePipes(ValidationPipe)
	public async validateToken(): Promise<boolean> {
		return true;
	}

	@Get('/validateSignInCode/:codeValue')
	@UsePipes(ValidationPipe)
	public async validateSignInCode(
		@Request() request,
		@Param('codeValue') codeValue: string,
	): Promise<boolean> {
		const user: IAuthPayload = request[AuthEnum.RequestProps.AUTH_PAYLOAD];

		return this._authService.validateSignInCode(user._id, codeValue);
	}
}

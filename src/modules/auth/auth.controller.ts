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
import { ISearchEmployee } from '../employees/interfaces/employees.types';
import CreateUserDto from '../users/interfaces/dto/createUser.dto';
import { IUserEntity } from '../users/interfaces/users.types';
import { AuthService } from './auth.service';
import { AuthPayload } from './decorators/current-user.decorator';
import { IAuthLogin, IAuthPayload } from './interfaces/auth.types';

@Controller('api/v1/auth')
export class AuthController {
	constructor(private _authService: AuthService) {}

	@Public()
	@Post('/signIn')
	@UsePipes(ValidationPipe)
	public async signIn(
		@Body() signInDto: Record<string, string>,
	): Promise<IAuthLogin> {
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
	): Promise<IAuthLogin> {
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

	@Public()
	@Get('/searchEmployees/:emailOrUsername')
	@UsePipes(ValidationPipe)
	public async searchEmployees(
		@Param('emailOrUsername', ValidationParamsPipe) emailOrUsername: string,
	): Promise<ISearchEmployee[]> {
		return await this._authService.searchEmployees(emailOrUsername);
	}

	@Public()
	@Post('/signInEmployee')
	@UsePipes(ValidationPipe)
	public async signInEmployee(
		@Body() signInDto: Record<string, string>,
	): Promise<IUserEntity> {
		return await this._authService.signInEmployee(
			signInDto.username,
			signInDto.password,
		);
	}

	@Get('/validateSignInEmployeeCode/:codeValue')
	@UsePipes(ValidationPipe)
	public async validateSignInEmployeeCode(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('codeValue', ValidationParamsPipe) codeValue: string,
	): Promise<boolean> {
		return await this._authService.validateSignInEmployeeCode(
			authPayload._id,
			authPayload.employeeId,
			codeValue,
		);
	}
}

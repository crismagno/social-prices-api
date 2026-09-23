import {
	Body,
	Controller,
	Get,
	Param,
	Post,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';

import {
	AllowsUnvalidatedSignIn,
	ManagerRoute,
	Public,
} from '../../shared/decorators/custom.decorator';
import { ValidationParamsPipe } from '../../shared/pipes/validation-params-pipe';
import { ManagerAuthPayload } from './decorators/manager-auth-payload.decorator';
import RecoverManagerPasswordDto from './interfaces/dto/recoverManagerPassword.dto';
import SignInManagerDto from './interfaces/dto/signInManager.dto';
import {
	IManagerAuthLogin,
	IManagerAuthPayload,
} from './interfaces/manager-auth.types';
import { ManagerAuthService } from './manager-auth.service';

@ManagerRoute()
@Controller('api/v1/manager-auth')
export class ManagerAuthController {
	constructor(private _managerAuthService: ManagerAuthService) {}

	@Public()
	@Post('/signIn')
	@UsePipes(ValidationPipe)
	public async signIn(
		@Body() signInManagerDto: SignInManagerDto,
	): Promise<IManagerAuthLogin> {
		return await this._managerAuthService.signIn(
			signInManagerDto.email,
			signInManagerDto.password,
		);
	}

	@AllowsUnvalidatedSignIn()
	@Get('/validateSignInCode/:codeValue')
	@UsePipes(ValidationPipe)
	public async validateSignInCode(
		@ManagerAuthPayload() payload: IManagerAuthPayload,
		@Param('codeValue', ValidationParamsPipe) codeValue: string,
	): Promise<IManagerAuthLogin | null> {
		return await this._managerAuthService.validateSignInCode(
			payload._id,
			codeValue,
		);
	}

	@Get('/getAuthManagerByToken')
	@UsePipes(ValidationPipe)
	public async getAuthManagerByToken(
		@ManagerAuthPayload() payload: IManagerAuthPayload,
	): Promise<IManagerAuthLogin> {
		return await this._managerAuthService.getAuthManagerByToken(payload._id);
	}

	@Public()
	@Get('/sendRecoverPasswordCode/:email')
	public async sendRecoverPasswordCode(
		@Param('email', ValidationParamsPipe) email: string,
	): Promise<void> {
		await this._managerAuthService.sendRecoverPasswordCode(email);
	}

	@Public()
	@Post('/recoverPassword')
	@UsePipes(ValidationPipe)
	public async recoverPassword(
		@Body() recoverManagerPasswordDto: RecoverManagerPasswordDto,
	): Promise<void> {
		await this._managerAuthService.recoverPassword(recoverManagerPasswordDto);
	}
}

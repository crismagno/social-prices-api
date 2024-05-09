import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Post,
	Request,
	UploadedFile,
	UseInterceptors,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { Public } from '../../shared/decorators/custom.decorator';
import { parseFilePipeBuilder } from '../../shared/pipes/parse-file-builder-pipe';
import { ValidationParamsPipe } from '../../shared/pipes/validation-params-pipe';
import AuthEnum from '../auth/interfaces/auth.enum';
import { IAuthPayload } from '../auth/interfaces/auth.types';
import RecoverPasswordDto from './interfaces/dto/recoverPassword.dto';
import UpdateEmailDto from './interfaces/dto/updateEmail.dto';
import UpdateUserDto from './interfaces/dto/updateUser.dto';
import UpdateUserAddressesDto from './interfaces/dto/updateUserAddresses.dto';
import UpdateUserPhoneNumbersDto from './interfaces/dto/updateUserPhoneNumbers.dto';
import { IUserEntity } from './interfaces/users.types';
import { UsersService } from './users.service';

@Controller('api/v1/users')
export class UsersController {
	constructor(private _usersService: UsersService) {}

	@Get('/getUser')
	public async getUser(@Request() request: any): Promise<IUserEntity> {
		const authPayload: IAuthPayload =
			request[AuthEnum.RequestProps.AUTH_PAYLOAD];

		return await this._usersService.getUserByUserId(authPayload._id);
	}

	@Get('/getUserByToken')
	public async getUserWIthTokenByUserId(
		@Request() request: any,
	): Promise<IUserEntity> {
		const authPayload: IAuthPayload =
			request[AuthEnum.RequestProps.AUTH_PAYLOAD];

		return await this._usersService.getUserWIthTokenByUserId(authPayload._id);
	}

	@Public()
	@Get('/sendRecoverPasswordCode/:email')
	public async sendRecoverPasswordCode(
		@Param('email', ValidationParamsPipe) email: string,
	): Promise<void> {
		await this._usersService.sendRecoverPasswordCode(email);
	}

	@Public()
	@Post('/recoverPassword')
	@UsePipes(ValidationPipe)
	public async recoverPassword(
		@Body() recoverPasswordDto: RecoverPasswordDto,
	): Promise<void> {
		await this._usersService.recoverPassword(recoverPasswordDto);
	}

	@Post('/updateUser')
	@UsePipes(ValidationPipe)
	public async updateUserDto(
		@Request() request: any,
		@Body() updateUserDto: UpdateUserDto,
	): Promise<IUserEntity> {
		const authPayload: IAuthPayload =
			request[AuthEnum.RequestProps.AUTH_PAYLOAD];

		return await this._usersService.updateUser(authPayload._id, updateUserDto);
	}

	@Post('/updateUserAddresses')
	@UsePipes(ValidationPipe)
	public async updateUserAddresses(
		@Request() request: any,
		@Body() updateUserAddressesDto: UpdateUserAddressesDto,
	): Promise<IUserEntity> {
		const authPayload: IAuthPayload =
			request[AuthEnum.RequestProps.AUTH_PAYLOAD];

		return await this._usersService.updateUserAddresses(
			authPayload._id,
			updateUserAddressesDto,
		);
	}

	@Post('/updateUserPhoneNumbers')
	@UsePipes(ValidationPipe)
	public async updateUserPhoneNumbers(
		@Request() request: any,
		@Body() updateUserPhoneNumbersDto: UpdateUserPhoneNumbersDto,
	): Promise<IUserEntity> {
		const authPayload: IAuthPayload =
			request[AuthEnum.RequestProps.AUTH_PAYLOAD];

		return await this._usersService.updateUserPhoneNumbers(
			authPayload._id,
			updateUserPhoneNumbersDto,
		);
	}

	@Post('/uploadAvatar')
	@UseInterceptors(FileInterceptor('avatar'))
	public async uploadAvatar(
		@UploadedFile(parseFilePipeBuilder())
		file: Express.Multer.File,
		@Request()
		request: any,
	): Promise<IUserEntity> {
		const authPayload: IAuthPayload =
			request[AuthEnum.RequestProps.AUTH_PAYLOAD];

		return await this._usersService.updateAvatar(authPayload._id, file);
	}

	@Delete('/removeAvatar')
	public async removeAvatar(@Request() request: any): Promise<IUserEntity> {
		const authPayload: IAuthPayload =
			request[AuthEnum.RequestProps.AUTH_PAYLOAD];

		return await this._usersService.removeAvatar(authPayload._id);
	}

	@Get('/sendUpdateEmailCode/:email')
	public async sendUpdateEmailCode(
		@Request() request: any,
		@Param('email', ValidationParamsPipe) email: string,
	): Promise<void> {
		const authPayload: IAuthPayload =
			request[AuthEnum.RequestProps.AUTH_PAYLOAD];

		await this._usersService.sendUpdateEmailCode(authPayload._id, email);
	}

	@Post('/updateEmail')
	@UsePipes(ValidationPipe)
	public async updateEmail(
		@Request() request: any,
		@Body() updateEmailDto: UpdateEmailDto,
	): Promise<IUserEntity> {
		const authPayload: IAuthPayload =
			request[AuthEnum.RequestProps.AUTH_PAYLOAD];

		return await this._usersService.updateEmail(
			authPayload._id,
			updateEmailDto,
		);
	}
}

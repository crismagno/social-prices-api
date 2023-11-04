import {
	Body,
	Controller,
	Get,
	HttpStatus,
	Param,
	ParseFilePipeBuilder,
	Post,
	Request,
	Res,
	UploadedFile,
	UseInterceptors,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import AuthEnum from '../auth/interfaces/auth.enum';
import { IAuthPayload } from '../auth/interfaces/auth.types';
import { Public } from '../shared/decorators/custom.decorator';
import { fileInterceptorOptionsUploadAvatar } from '../shared/helpers/global/files-interceptors';
import { ValidationParamsPipe } from '../shared/pipes/validation-params-pipe';
import RecoverPasswordDto from './interfaces/dto/recoverPassword.dto';
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
	@UseInterceptors(
		FileInterceptor(
			'avatar',
			fileInterceptorOptionsUploadAvatar('./uploads/avatars'),
		),
	)
	public uploadAvatar(
		@UploadedFile(
			new ParseFilePipeBuilder()
				.addFileTypeValidator({
					fileType: /(jpg|jpeg|png|gif)$/,
				})
				.addMaxSizeValidator({
					maxSize: 5242880,
				})
				.build({
					errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
				}),
		)
		file: Express.Multer.File,
		@Request() request: any,
	) {
		const authPayload: IAuthPayload =
			request[AuthEnum.RequestProps.AUTH_PAYLOAD];

		return this._usersService.updateAvatar(authPayload._id, file.filename);
	}

	@Public()
	@Get('/avatars/:filename')
	public getAvatarImage(
		@Res() res: any,
		@Param('filename', ValidationParamsPipe) filename: string,
	) {
		return res.sendFile(filename, {
			root: './uploads/avatars',
		});
	}
}

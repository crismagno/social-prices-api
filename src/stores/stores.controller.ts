import {
	Body,
	Controller,
	Get,
	HttpStatus,
	Param,
	ParseFilePipeBuilder,
	Post,
	Put,
	Request,
	UploadedFile,
	UseInterceptors,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import AuthEnum from '../auth/interfaces/auth.enum';
import { IAuthPayload } from '../auth/interfaces/auth.types';
import { ValidationParamsPipe } from '../shared/pipes/validation-params-pipe';
import CreateStoreDto from './interfaces/dto/createStore.dto';
import UpdateStoreDto from './interfaces/dto/updateStore.dto';
import { IStore } from './interfaces/stores.interface';
import { StoresService } from './stores.service';

@Controller('api/v1/stores')
export class StoresController {
	constructor(private _storeService: StoresService) {}

	@UsePipes(ValidationPipe)
	@Post('/')
	@UseInterceptors(FileInterceptor('logo'))
	public async create(
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
		@Body() createStoreDto: CreateStoreDto,
	): Promise<IStore> {
		const authPayload: IAuthPayload =
			request[AuthEnum.RequestProps.AUTH_PAYLOAD];

		return await this._storeService.create(
			file,
			createStoreDto,
			authPayload._id,
		);
	}

	@UsePipes(ValidationPipe)
	@Put('/')
	@UseInterceptors(FileInterceptor('logo'))
	public async update(
		@UploadedFile(
			new ParseFilePipeBuilder()
				.addFileTypeValidator({
					fileType: /(jpg|jpeg|png|gif)$/,
				})
				.addMaxSizeValidator({
					maxSize: 5242880,
				})
				.build({
					fileIsRequired: false,
					errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
				}),
		)
		file: Express.Multer.File,
		@Body() updateStoreDto: UpdateStoreDto,
	): Promise<IStore> {
		return await this._storeService.update(file, updateStoreDto);
	}

	@Get('/user')
	@UsePipes(ValidationPipe)
	public async findByUserId(@Request() request: any): Promise<IStore[]> {
		const authPayload: IAuthPayload =
			request[AuthEnum.RequestProps.AUTH_PAYLOAD];
		return await this._storeService.findByUserId(authPayload._id);
	}

	@Get('/:storeId')
	@UsePipes(ValidationPipe)
	public async findById(
		@Param('storeId', ValidationParamsPipe) storeId: string,
	): Promise<IStore> {
		return await this._storeService.findById(storeId);
	}
}

import {
	Body,
	Controller,
	Get,
	HttpStatus,
	Param,
	ParseFilePipeBuilder,
	Post,
	Put,
	UploadedFile,
	UseInterceptors,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { parseFilePipeBuilder } from '../../shared/pipes/parse-file-builder-pipe';
import { ValidationParamsPipe } from '../../shared/pipes/validation-params-pipe';
import {
	ITableStateRequest,
	ITableStateResponse,
} from '../../shared/utils/table/table-state.interface';
import { AuthPayload } from '../auth/decorators/current-user.decorator';
import { IAuthPayload } from '../auth/interfaces/auth.types';
import CreateStoreDto from './interfaces/dto/createStore.dto';
import UpdateStoreDto from './interfaces/dto/updateStore.dto';
import { IStore } from './interfaces/store.interface';
import { StoresService } from './stores.service';

@Controller('api/v1/stores')
export class StoresController {
	constructor(private _storesService: StoresService) {}

	@Post('/')
	@UsePipes(ValidationPipe)
	@UseInterceptors(FileInterceptor('logo'))
	public async create(
		@UploadedFile(parseFilePipeBuilder({ build: { fileIsRequired: false } }))
		file: Express.Multer.File,
		@AuthPayload() authPayload: IAuthPayload,
		@Body() createStoreDto: CreateStoreDto,
	): Promise<IStore> {
		return await this._storesService.create(
			file,
			createStoreDto,
			authPayload._id,
		);
	}

	@Put('/')
	@UsePipes(ValidationPipe)
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
		return await this._storesService.update(file, updateStoreDto);
	}

	@Get('/user')
	@UsePipes(ValidationPipe)
	public async findByUserId(
		@AuthPayload() authPayload: IAuthPayload,
	): Promise<IStore[]> {
		return await this._storesService.findByUserId(authPayload._id);
	}

	@Post('/userTableState')
	@UsePipes(ValidationPipe)
	public async findByUserTableState(
		@AuthPayload() authPayload: IAuthPayload,
		@Body() tableState: ITableStateRequest<IStore>,
	): Promise<ITableStateResponse<IStore[]>> {
		return await this._storesService.findByUserTableState(
			authPayload._id,
			tableState,
		);
	}

	@Get('/:storeId')
	@UsePipes(ValidationPipe)
	public async findById(
		@Param('storeId', ValidationParamsPipe) storeId: string,
	): Promise<IStore | null> {
		return await this._storesService.findById(storeId);
	}
}

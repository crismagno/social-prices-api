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

import AuthEnum from '../auth/interfaces/auth.enum';
import { IAuthPayload } from '../auth/interfaces/auth.types';
import { ValidationParamsPipe } from '../shared/pipes/validation-params-pipe';
import CreateStoreDto from './interfaces/dto/createStore.dto';
import { IStore } from './interfaces/stores.interface';
import { StoresService } from './stores.service';

@Controller('api/v1/stores')
export class StoresController {
	constructor(private _storeService: StoresService) {}

	@Post('/')
	@UsePipes(ValidationPipe)
	public async create(
		@Request() request: any,
		@Body() createStoreDto: CreateStoreDto,
	): Promise<IStore> {
		const authPayload: IAuthPayload =
			request[AuthEnum.RequestProps.AUTH_PAYLOAD];
		return this._storeService.create(createStoreDto, authPayload._id);
	}

	@Get('/user')
	@UsePipes(ValidationPipe)
	public async findByUserId(@Request() request: any): Promise<IStore[]> {
		const authPayload: IAuthPayload =
			request[AuthEnum.RequestProps.AUTH_PAYLOAD];
		return this._storeService.findByUserId(authPayload._id);
	}

	@Get('/:storeId')
	@UsePipes(ValidationPipe)
	public async findById(
		@Param('storeId', ValidationParamsPipe) storeId: string,
	): Promise<IStore> {
		return this._storeService.findById(storeId);
	}
}

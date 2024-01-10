import {
	Body,
	Controller,
	Post,
	Request,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';

import AuthEnum from '../auth/interfaces/auth.enum';
import { IAuthPayload } from '../auth/interfaces/auth.types';
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
}

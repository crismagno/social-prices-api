import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	Param,
	Post,
	Put,
	UseGuards,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';

import { ValidationParamsPipe } from '../../shared/pipes/validation-params-pipe';
import { AppEnabledGuard } from '../apps/core/guards/app-enabled.guard';
import { RequiresApp } from '../apps/core/guards/requires-app.decorator';
import AppsEnum from '../apps/interfaces/apps.enum';
import { AuthPayload } from '../auth/decorators/current-user.decorator';
import { IAuthPayload } from '../auth/interfaces/auth.types';
import {
	CreateStoreSiteMockDto,
	UpdateStoreSiteMockDto,
} from './interfaces/dto/saveStoreSiteMock.dto';
import { IStoreSiteMock } from './interfaces/store-site-mock.schema';
import {
	IStoreSiteMocksList,
	StoreSiteMocksService,
} from './store-site-mocks.service';

const validation = new ValidationPipe({ transform: true, whitelist: true });

/** The mocks the owner keeps of a store's site. */
@RequiresApp(AppsEnum.App.SITE)
@UseGuards(AppEnabledGuard)
@Controller('api/v1/store-sites')
export class StoreSiteMocksController {
	constructor(private readonly _mocksService: StoreSiteMocksService) {}

	@Get('/store/:storeId/mocks')
	public async list(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('storeId', ValidationParamsPipe) storeId: string,
	): Promise<IStoreSiteMocksList> {
		return await this._mocksService.list(authPayload._id, storeId);
	}

	@Post('/store/:storeId/mocks')
	@UsePipes(validation)
	public async create(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('storeId', ValidationParamsPipe) storeId: string,
		@Body() dto: CreateStoreSiteMockDto,
	): Promise<IStoreSiteMock> {
		return await this._mocksService.create(authPayload._id, storeId, dto);
	}

	@Get('/mocks/:mockId')
	public async findOne(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('mockId', ValidationParamsPipe) mockId: string,
	): Promise<IStoreSiteMock> {
		return await this._mocksService.findOne(authPayload._id, mockId);
	}

	@Put('/mocks/:mockId')
	@UsePipes(validation)
	public async update(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('mockId', ValidationParamsPipe) mockId: string,
		@Body() dto: UpdateStoreSiteMockDto,
	): Promise<IStoreSiteMock> {
		return await this._mocksService.update(authPayload._id, mockId, dto);
	}

	@Delete('/mocks/:mockId')
	@HttpCode(204)
	public async remove(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('mockId', ValidationParamsPipe) mockId: string,
	): Promise<void> {
		await this._mocksService.remove(authPayload._id, mockId);
	}
}

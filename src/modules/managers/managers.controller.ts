import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Post,
	Put,
	UseGuards,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';

import { ManagerRoute } from '../../shared/decorators/custom.decorator';
import { ValidationParamsPipe } from '../../shared/pipes/validation-params-pipe';
import {
	ITableStateRequest,
	ITableStateResponse,
} from '../../shared/utils/table/table-state.interface';
import { ManagerAuthPayload } from '../manager-auth/decorators/manager-auth-payload.decorator';
import {
	ManagerLevelGuard,
	ManagerLevels,
} from '../manager-auth/guards/manager-level.guard';
import { IManagerAuthPayload } from '../manager-auth/interfaces/manager-auth.types';
import CreateManagerDto from './interfaces/dto/createManager.dto';
import DeleteManagerDto from './interfaces/dto/deleteManager.dto';
import UpdateManagerDto from './interfaces/dto/updateManager.dto';
import ManagerEntity from './interfaces/manager.entity';
import { IManager } from './interfaces/manager.interface';
import ManagersEnum from './interfaces/managers.enum';
import { IManagerEntity } from './interfaces/managers.types';
import { ManagersService } from './managers.service';

@ManagerRoute()
@UseGuards(ManagerLevelGuard)
@Controller('api/v1/managers')
export class ManagersController {
	constructor(private _managersService: ManagersService) {}

	@Post('/tableState')
	@UsePipes(ValidationPipe)
	public async findByTableState(
		@Body() tableState: ITableStateRequest<IManager>,
	): Promise<ITableStateResponse<IManagerEntity[]>> {
		return await this._managersService.findByTableState(tableState);
	}

	@Get('/:managerId')
	@UsePipes(ValidationPipe)
	public async findById(
		@ManagerAuthPayload() payload: IManagerAuthPayload,
		@Param('managerId', ValidationParamsPipe) managerId: string,
	): Promise<IManagerEntity> {
		const manager: IManager = await this._managersService.findByIdForActor(
			payload,
			managerId,
		);

		return new ManagerEntity(manager);
	}

	@Post('/')
	@ManagerLevels(ManagersEnum.Level.ADMIN, ManagersEnum.Level.MANAGER)
	@UsePipes(ValidationPipe)
	public async create(
		@ManagerAuthPayload() payload: IManagerAuthPayload,
		@Body() createManagerDto: CreateManagerDto,
	): Promise<IManagerEntity> {
		return await this._managersService.create(payload, createManagerDto);
	}

	@Put('/')
	@UsePipes(ValidationPipe)
	public async update(
		@ManagerAuthPayload() payload: IManagerAuthPayload,
		@Body() updateManagerDto: UpdateManagerDto,
	): Promise<IManagerEntity> {
		return await this._managersService.update(payload, updateManagerDto);
	}

	@Delete('/deleteManual/:managerId')
	@ManagerLevels(ManagersEnum.Level.ADMIN, ManagersEnum.Level.MANAGER)
	@UsePipes(ValidationPipe)
	public async deleteManual(
		@ManagerAuthPayload() payload: IManagerAuthPayload,
		@Param('managerId', ValidationParamsPipe) managerId: string,
		@Body() deleteManagerDto: DeleteManagerDto,
	): Promise<IManagerEntity> {
		return await this._managersService.deleteManual(
			payload,
			managerId,
			deleteManagerDto?.reason ?? null,
		);
	}

	@Put('/activateManual/:managerId')
	@ManagerLevels(ManagersEnum.Level.ADMIN, ManagersEnum.Level.MANAGER)
	@UsePipes(ValidationPipe)
	public async activateManual(
		@ManagerAuthPayload() payload: IManagerAuthPayload,
		@Param('managerId', ValidationParamsPipe) managerId: string,
	): Promise<IManagerEntity> {
		return await this._managersService.activateManual(payload, managerId);
	}
}

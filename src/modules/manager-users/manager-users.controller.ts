import {
	Body,
	Controller,
	Get,
	NotFoundException,
	Param,
	Patch,
	Post,
	UseGuards,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';

import { ManagerRoute } from '../../shared/decorators/custom.decorator';
import {
	ITableStateRequest,
	ITableStateResponse,
} from '../../shared/utils/table/table-state.interface';
import {
	ManagerLevelGuard,
	ManagerLevels,
} from '../manager-auth/guards/manager-level.guard';
import ManagersEnum from '../managers/interfaces/managers.enum';
import UpdateUserByManagerDto from '../users/interfaces/dto/updateUserByManager.dto';
import UpdateUserLimitsDto from '../users/interfaces/dto/updateUserLimits.dto';
import UserEntity from '../users/interfaces/user.entity';
import { IUser } from '../users/interfaces/user.interface';
import { IUserEntity } from '../users/interfaces/users.types';
import { UsersService } from '../users/users.service';

/**
 * The manager panel reads every user (any level, including SUB_MANAGER). Only
 * ADMIN and MANAGER may change a user's data or feature limits. Never exposed
 * here: password, authToken and authProvider.
 */
@ManagerRoute()
@UseGuards(ManagerLevelGuard)
@Controller('api/v1/manager-users')
export class ManagerUsersController {
	constructor(private _usersService: UsersService) {}

	@Post('/tableState')
	@UsePipes(ValidationPipe)
	public async findByTableState(
		@Body() tableState: ITableStateRequest<IUser>,
	): Promise<ITableStateResponse<IUserEntity[]>> {
		return await this._usersService.findByTableState(tableState);
	}

	@Get('/:id')
	public async findById(@Param('id') id: string): Promise<IUserEntity> {
		const user: IUser | undefined = await this._usersService.findOneById(id);

		if (!user) {
			throw new NotFoundException('User not found.');
		}

		return new UserEntity(user);
	}

	@Patch('/:id')
	@ManagerLevels(ManagersEnum.Level.ADMIN, ManagersEnum.Level.MANAGER)
	@UsePipes(ValidationPipe)
	public async update(
		@Param('id') id: string,
		@Body() dto: UpdateUserByManagerDto,
	): Promise<IUserEntity> {
		return await this._usersService.updateUserByManager(id, dto);
	}

	@Patch('/:id/limits')
	@ManagerLevels(ManagersEnum.Level.ADMIN, ManagersEnum.Level.MANAGER)
	@UsePipes(new ValidationPipe({ transform: true }))
	public async updateLimits(
		@Param('id') id: string,
		@Body() dto: UpdateUserLimitsDto,
	): Promise<IUserEntity> {
		return await this._usersService.updateUserLimits(id, dto);
	}
}

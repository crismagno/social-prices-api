import {
	Body,
	Controller,
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
import { ManagerLevelGuard } from '../manager-auth/guards/manager-level.guard';
import { IUser } from '../users/interfaces/user.interface';
import { IUserEntity } from '../users/interfaces/users.types';
import { UsersService } from '../users/users.service';

/**
 * Read only. The manager panel can look at the users of the system and nothing else:
 * no update, no delete, no password. Every level, including SUB_MANAGER, may read.
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
}

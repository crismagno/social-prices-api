import {
	Body,
	Controller,
	Get,
	Param,
	Post,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';

import { ValidationParamsPipe } from '../../shared/pipes/validation-params-pipe';
import {
	ITableStateRequest,
	ITableStateResponse,
} from '../../shared/utils/table/table-state.interface';
import { AuthPayload } from '../auth/decorators/current-user.decorator';
import { IAuthPayload } from '../auth/interfaces/auth.types';
import UpdateToSeenDto from './interfaces/dto/updateToSeen.dto';
import { INotification } from './interfaces/notification.interface';
import { NotificationsService } from './notifications.service';

@Controller('api/v1/notifications')
export class NotificationsController {
	constructor(private _notificationsService: NotificationsService) {}

	@Post('/userTableState')
	@UsePipes(ValidationPipe)
	public async findByUserTableState(
		@AuthPayload() authPayload: IAuthPayload,
		@Body() tableState: ITableStateRequest<INotification>,
	): Promise<ITableStateResponse<INotification[]>> {
		return await this._notificationsService.findByUserTableState(
			authPayload._id,
			tableState,
		);
	}

	@Get('/countNotSeenByUser')
	@UsePipes(ValidationPipe)
	public async countNotSeenByUser(
		@AuthPayload() authPayload: IAuthPayload,
	): Promise<number> {
		return await this._notificationsService.countNotSeenByUser(authPayload._id);
	}

	@Post('/updateToSeen')
	@UsePipes(ValidationPipe)
	public async updateToSeen(
		@Body() updateToSeenDto: UpdateToSeenDto,
	): Promise<void> {
		await this._notificationsService.updateToSeen(
			updateToSeenDto.notificationIds,
		);
	}

	@Get('/:notificationId')
	@UsePipes(ValidationPipe)
	public async findById(
		@Param('notificationId', ValidationParamsPipe) notificationId: string,
	): Promise<INotification | null> {
		return await this._notificationsService.findById(notificationId);
	}
}

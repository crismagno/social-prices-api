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

import { ValidationParamsPipe } from '../../shared/pipes/validation-params-pipe';
import {
	ITableStateRequest,
	ITableStateResponse,
} from '../../shared/utils/table/table-state.interface';
import AuthEnum from '../auth/interfaces/auth.enum';
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
		@Request() request: any,
		@Body() tableState: ITableStateRequest<INotification>,
	): Promise<ITableStateResponse<INotification[]>> {
		const authPayload: IAuthPayload =
			request[AuthEnum.RequestProps.AUTH_PAYLOAD];

		return await this._notificationsService.findByUserTableState(
			authPayload._id,
			tableState,
		);
	}

	@Get('/countNotSeenByUser')
	@UsePipes(ValidationPipe)
	public async countNotSeenByUser(@Request() request: any): Promise<number> {
		const authPayload: IAuthPayload =
			request[AuthEnum.RequestProps.AUTH_PAYLOAD];

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

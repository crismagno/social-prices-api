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

import {
	ITableStateRequest,
	ITableStateResponse,
} from '../../shared/helpers/table/table-state.interface';
import { ValidationParamsPipe } from '../../shared/pipes/validation-params-pipe';
import AuthEnum from '../auth/interfaces/auth.enum';
import { IAuthPayload } from '../auth/interfaces/auth.types';
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

	@Get('/:notificationId')
	@UsePipes(ValidationPipe)
	public async findById(
		@Param('notificationId', ValidationParamsPipe) notificationId: string,
	): Promise<INotification> {
		return await this._notificationsService.findById(notificationId);
	}
}

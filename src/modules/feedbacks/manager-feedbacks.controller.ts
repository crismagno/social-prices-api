import {
	Body,
	Controller,
	Get,
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
import { ManagerAuthPayload } from '../manager-auth/decorators/manager-auth-payload.decorator';
import {
	ManagerLevelGuard,
	ManagerLevels,
} from '../manager-auth/guards/manager-level.guard';
import { IManagerAuthPayload } from '../manager-auth/interfaces/manager-auth.types';
import ManagersEnum from '../managers/interfaces/managers.enum';
import { FeedbacksService } from './feedbacks.service';
import UpdateFeedbackStatusDto from './interfaces/dto/updateFeedbackStatus.dto';
import { IFeedback } from './interfaces/feedback.interface';

/**
 * The manager panel reads every feedback (any level, including SUB_MANAGER).
 * Only ADMIN and MANAGER may change a feedback's status.
 */
@ManagerRoute()
@UseGuards(ManagerLevelGuard)
@Controller('api/v1/manager-feedbacks')
export class ManagerFeedbacksController {
	constructor(private readonly _feedbacksService: FeedbacksService) {}

	@Post('/tableState')
	@UsePipes(ValidationPipe)
	public async findByTableState(
		@Body() tableState: ITableStateRequest<IFeedback>,
	): Promise<ITableStateResponse<IFeedback[]>> {
		return await this._feedbacksService.findByTableState(tableState);
	}

	@Get('/:id')
	public async findById(@Param('id') id: string): Promise<IFeedback> {
		return await this._feedbacksService.findById(id);
	}

	@Patch('/:id/status')
	@ManagerLevels(ManagersEnum.Level.ADMIN, ManagersEnum.Level.MANAGER)
	@UsePipes(ValidationPipe)
	public async updateStatus(
		@Param('id') id: string,
		@Body() updateFeedbackStatusDto: UpdateFeedbackStatusDto,
		@ManagerAuthPayload() payload: IManagerAuthPayload,
	): Promise<IFeedback> {
		return await this._feedbacksService.updateStatus(
			id,
			updateFeedbackStatusDto,
			payload._id,
		);
	}
}

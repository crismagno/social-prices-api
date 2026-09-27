import {
	Body,
	Controller,
	Post,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';

import { AuthPayload } from '../auth/decorators/current-user.decorator';
import { IAuthPayload } from '../auth/interfaces/auth.types';
import { FeedbacksService } from './feedbacks.service';
import CreateFeedbackDto from './interfaces/dto/createFeedback.dto';

@Controller('api/v1/feedbacks')
export class FeedbacksController {
	constructor(private readonly _feedbacksService: FeedbacksService) {}

	@Post()
	@UsePipes(ValidationPipe)
	public async create(
		@AuthPayload() authPayload: IAuthPayload,
		@Body() createFeedbackDto: CreateFeedbackDto,
	): Promise<void> {
		await this._feedbacksService.create(
			{
				_id: authPayload._id,
				email: authPayload.email,
				employeeId: authPayload.employeeId,
			},
			createFeedbackDto,
		);
	}
}

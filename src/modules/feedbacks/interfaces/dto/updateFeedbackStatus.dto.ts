import { IsEnum } from 'class-validator';

import FeedbacksEnum from '../feedbacks.enum';

export default class UpdateFeedbackStatusDto {
	@IsEnum(FeedbacksEnum.Status)
	status: FeedbacksEnum.Status;
}

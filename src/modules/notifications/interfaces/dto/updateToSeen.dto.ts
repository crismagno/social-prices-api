import { IsArray } from 'class-validator';

export default class UpdateToSeenDto {
	@IsArray()
	notificationIds: string[];
}

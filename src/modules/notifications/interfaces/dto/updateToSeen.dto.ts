import { Type } from 'class-transformer';
import { IsArray } from 'class-validator';

export default class UpdateToSeenDto {
	@IsArray()
	@Type(() => String)
	notificationIds: string[];
}

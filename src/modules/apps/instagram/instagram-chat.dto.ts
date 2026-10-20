import { Type } from 'class-transformer';
import {
	IsInt,
	IsMongoId,
	IsOptional,
	IsString,
	Matches,
	Max,
	MaxLength,
	Min,
} from 'class-validator';

// Instagram refuses anything longer than 1000 characters in one message.
export const MAX_INSTAGRAM_TEXT_LENGTH: number = 1000;

export class SendInstagramMessageDto {
	@IsString()
	@MaxLength(MAX_INSTAGRAM_TEXT_LENGTH)
	@Matches(/\S/, { message: 'text must not be empty.' })
	text: string;
}

export class LinkInstagramCustomerDto {
	@IsMongoId()
	customerId: string;
}

export class InstagramChatMessagesQueryDto {
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(100)
	limit?: number;

	/** The id of the oldest message already loaded. */
	@IsOptional()
	@IsMongoId()
	before?: string;
}

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

// Telegram refuses anything longer than 4096 characters in one message.
export const MAX_TELEGRAM_TEXT_LENGTH: number = 4096;

export class SendTelegramMessageDto {
	@IsString()
	@MaxLength(MAX_TELEGRAM_TEXT_LENGTH)
	@Matches(/\S/, { message: 'text must not be empty.' })
	text: string;
}

export class LinkTelegramCustomerDto {
	@IsMongoId()
	customerId: string;
}

export class ChatMessagesQueryDto {
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

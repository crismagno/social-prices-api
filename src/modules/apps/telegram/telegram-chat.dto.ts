import { Transform, Type } from 'class-transformer';
import {
	IsBoolean,
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

// Telegram refuses a caption longer than 1024 characters.
export const MAX_TELEGRAM_CAPTION_LENGTH: number = 1024;

// A bot can download files up to 20 MB, so that is the most that is worth sending.
export const MAX_TELEGRAM_UPLOAD_BYTES: number = 20 * 1024 * 1024;

export class SendTelegramMediaDto {
	@IsOptional()
	@IsString()
	@MaxLength(MAX_TELEGRAM_CAPTION_LENGTH)
	caption?: string;

	/** A recording from the microphone: delivered as a voice message. */
	@IsOptional()
	@Transform(({ value }) => value === true || value === 'true')
	@IsBoolean()
	voice?: boolean;
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

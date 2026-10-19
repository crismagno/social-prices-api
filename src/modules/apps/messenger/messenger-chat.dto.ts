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

// Messenger refuses anything longer than 2000 characters in one message.
export const MAX_MESSENGER_TEXT_LENGTH: number = 2000;

export class SendMessengerMessageDto {
	@IsString()
	@MaxLength(MAX_MESSENGER_TEXT_LENGTH)
	@Matches(/\S/, { message: 'text must not be empty.' })
	text: string;
}

export class LinkMessengerCustomerDto {
	@IsMongoId()
	customerId: string;
}

export class MessengerChatMessagesQueryDto {
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

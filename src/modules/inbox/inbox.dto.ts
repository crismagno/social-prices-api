import { Transform, Type } from 'class-transformer';
import InboxEnum from './interfaces/inbox.enum';
import {
	IsBoolean,
	IsEnum,
	IsInt,
	IsMongoId,
	IsOptional,
	IsString,
	Max,
	MaxLength,
	Min,
	ValidateIf,
} from 'class-validator';

/** Which conversations a call is about: a customer's, or one conversation. */
export class InboxScopeQueryDto {
	@IsOptional()
	@IsMongoId()
	customerId?: string;

	@IsOptional()
	@IsMongoId()
	conversationId?: string;

	/** Only this channel's conversations (an app's own page). */
	@IsOptional()
	@IsEnum(InboxEnum.Channel)
	channel?: InboxEnum.Channel;
}

export class InboxChatsQueryDto {
	@IsOptional()
	@IsEnum(InboxEnum.Channel)
	channel?: InboxEnum.Channel;
}

export class InboxMessagesQueryDto extends InboxScopeQueryDto {
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(100)
	limit?: number;

	@IsOptional()
	@IsString()
	before?: string;
}

/** A conversation's new customer; null frees it. */
export class InboxAssignCustomerDto {
	@ValidateIf((_: unknown, value: unknown) => value !== null)
	@IsMongoId()
	customerId: string | null;
}

export class InboxReplyDto {
	@IsString()
	text: string;
}

/** A file or a recording sent through a conversation (the file itself comes as multipart). */
export class InboxSendMediaDto {
	@IsOptional()
	@IsString()
	@MaxLength(1000)
	caption?: string;

	/** A recording from the microphone: delivered as a voice message. */
	@IsOptional()
	@Transform(({ value }) => value === true || value === 'true')
	@IsBoolean()
	voice?: boolean;
}

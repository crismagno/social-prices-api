import { Type } from 'class-transformer';
import {
	IsInt,
	IsMongoId,
	IsOptional,
	IsString,
	Max,
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

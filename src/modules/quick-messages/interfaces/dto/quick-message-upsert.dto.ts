import { Type } from 'class-transformer';
import {
	ArrayMaxSize,
	ArrayMinSize,
	IsArray,
	IsBoolean,
	IsEnum,
	IsInt,
	IsMongoId,
	IsNotEmpty,
	IsOptional,
	IsString,
	MaxLength,
	Min,
	ValidateIf,
	ValidateNested,
} from 'class-validator';

import InboxEnum from '../../../inbox/interfaces/inbox.enum';
import QuickMessagesEnum from '../quick-messages.enum';

/**
 * One block as the editor sends it. A new file points at its place in the
 * uploaded `files` (`fileIndex`); a kept file says which one it is (`fileKey`).
 */
export class QuickMessageBlockInputDto {
	@IsEnum(QuickMessagesEnum.BlockType)
	type: QuickMessagesEnum.BlockType;

	@IsOptional()
	@IsString()
	@MaxLength(QuickMessagesEnum.MAX_TEXT_LENGTH)
	text?: string;

	@IsOptional()
	@IsString()
	@MaxLength(QuickMessagesEnum.MAX_TEXT_LENGTH)
	caption?: string | null;

	@IsOptional()
	@IsInt()
	@Min(0)
	fileIndex?: number;

	@IsOptional()
	@IsString()
	fileKey?: string;
}

export class QuickMessageUpsertDto {
	@IsString()
	@MaxLength(QuickMessagesEnum.MAX_NAME_LENGTH)
	name: string;

	@IsBoolean()
	allEmployees: boolean;

	@IsArray()
	@IsMongoId({ each: true })
	employeesIds: string[];

	@IsArray()
	@ArrayMinSize(1)
	@ArrayMaxSize(QuickMessagesEnum.MAX_BLOCKS)
	@ValidateNested({ each: true })
	@Type(() => QuickMessageBlockInputDto)
	blocks: QuickMessageBlockInputDto[];
}

export class QuickMessageDeleteDto {
	@IsOptional()
	@IsString()
	@MaxLength(500)
	reason?: string;
}

/**
 * Where it goes: the conversation's id (the central inbox), or the person on a
 * channel (an app's own chat, which only knows its own id of them).
 */
export class QuickMessageSendDto {
	@ValidateIf((dto: QuickMessageSendDto) => !dto.channel)
	@IsMongoId()
	conversationId?: string;

	@ValidateIf((dto: QuickMessageSendDto) => !dto.conversationId)
	@IsEnum(InboxEnum.Channel)
	channel?: InboxEnum.Channel;

	@ValidateIf((dto: QuickMessageSendDto) => !dto.conversationId)
	@IsString()
	@IsNotEmpty()
	@MaxLength(100)
	contactKey?: string;
}

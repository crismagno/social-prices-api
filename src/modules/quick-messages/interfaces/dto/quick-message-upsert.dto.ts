import { Type } from 'class-transformer';
import {
	ArrayMaxSize,
	ArrayMinSize,
	IsArray,
	IsBoolean,
	IsEnum,
	IsInt,
	IsMongoId,
	IsOptional,
	IsString,
	MaxLength,
	Min,
	ValidateNested,
} from 'class-validator';

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

export class QuickMessageSendDto {
	@IsMongoId()
	conversationId: string;
}

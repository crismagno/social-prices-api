import { IsMongoId, IsOptional, IsString } from 'class-validator';

export default class StartStoreChatDto {
	@IsMongoId()
	storeId: string;

	/** Absent when what comes first is a file, a recording or a quick message. */
	@IsOptional()
	@IsString()
	text?: string;
}

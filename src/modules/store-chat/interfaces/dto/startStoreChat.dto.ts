import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export default class StartStoreChatDto {
	@IsMongoId()
	storeId: string;

	@IsString()
	@IsNotEmpty()
	text: string;
}

import { IsNotEmpty, IsString } from 'class-validator';

export default class SendStoreChatMessageDto {
	@IsString()
	@IsNotEmpty()
	text: string;
}

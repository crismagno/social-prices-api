import { IsNotEmpty, IsString, Matches } from 'class-validator';

export default class SelectMessengerPageDto {
	/** A Facebook Page id: digits only. */
	@IsString()
	@IsNotEmpty()
	@Matches(/^\d{1,30}$/, { message: 'pageId must be a Facebook Page id.' })
	pageId: string;
}

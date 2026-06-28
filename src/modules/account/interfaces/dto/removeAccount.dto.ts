import { IsOptional, IsString } from 'class-validator';

export default class RemoveAccountDto {
	@IsOptional()
	@IsString()
	reason: string | null;
}

import { IsOptional, IsString } from 'class-validator';

export default class DeleteManagerDto {
	@IsOptional()
	@IsString()
	reason: string | null;
}

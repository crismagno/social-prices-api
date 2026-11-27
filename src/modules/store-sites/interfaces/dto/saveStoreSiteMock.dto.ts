import { Type } from 'class-transformer';
import {
	IsNotEmpty,
	IsOptional,
	IsString,
	MaxLength,
	ValidateNested,
} from 'class-validator';

import StoreSitesEnum from '../store-sites.enum';
import SaveStoreSiteDto from './saveStoreSite.dto';

export class CreateStoreSiteMockDto {
	@IsString()
	@IsNotEmpty()
	@MaxLength(StoreSitesEnum.MAX_MOCK_NAME_LENGTH)
	name: string;

	@ValidateNested()
	@Type(() => SaveStoreSiteDto)
	content: SaveStoreSiteDto;
}

/** A new name, a new content, or both. */
export class UpdateStoreSiteMockDto {
	@IsOptional()
	@IsString()
	@IsNotEmpty()
	@MaxLength(StoreSitesEnum.MAX_MOCK_NAME_LENGTH)
	name?: string;

	@IsOptional()
	@ValidateNested()
	@Type(() => SaveStoreSiteDto)
	content?: SaveStoreSiteDto;
}

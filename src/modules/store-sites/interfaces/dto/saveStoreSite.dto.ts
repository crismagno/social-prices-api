import { Transform, Type } from 'class-transformer';
import {
	ArrayMaxSize,
	IsArray,
	IsBoolean,
	IsEnum,
	IsMongoId,
	IsNotEmpty,
	IsOptional,
	IsString,
	Matches,
	MaxLength,
	ValidateNested,
} from 'class-validator';

import StoreSitesEnum from '../store-sites.enum';

export class StoreSiteThemeDto {
	@Matches(StoreSitesEnum.HEX_COLOR_REGEX)
	primary: string;

	@Matches(StoreSitesEnum.HEX_COLOR_REGEX)
	secondary: string;

	@Matches(StoreSitesEnum.HEX_COLOR_REGEX)
	accent: string;

	@Matches(StoreSitesEnum.HEX_COLOR_REGEX)
	background: string;

	@Matches(StoreSitesEnum.HEX_COLOR_REGEX)
	text: string;
}

export class StoreSiteHeroDto {
	@IsOptional()
	@IsString()
	@MaxLength(80)
	tagline: string | null;

	@IsString()
	@IsNotEmpty()
	@MaxLength(120)
	title: string;

	@IsOptional()
	@IsString()
	@MaxLength(400)
	subtitle: string | null;

	@IsOptional()
	@IsString()
	@MaxLength(600)
	backgroundImageUrl: string | null;

	@IsOptional()
	@IsString()
	@MaxLength(600)
	featuredImageUrl: string | null;

	@IsOptional()
	@IsString()
	@MaxLength(40)
	ctaLabel: string | null;
}

export class StoreSiteSectionDto {
	@IsString()
	@IsNotEmpty()
	@MaxLength(60)
	key: string;

	@IsString()
	@IsNotEmpty()
	@MaxLength(120)
	title: string;

	@IsOptional()
	@IsString()
	@MaxLength(600)
	description: string | null;

	@IsOptional()
	@IsString()
	@MaxLength(600)
	imageUrl: string | null;

	@IsBoolean()
	isActive: boolean;
}

export class StoreSiteMarqueeDto {
	@IsBoolean()
	isActive: boolean;

	@IsArray()
	@ArrayMaxSize(StoreSitesEnum.MAX_MARQUEE_ITEMS)
	@IsString({ each: true })
	@MaxLength(60, { each: true })
	items: string[];
}

export default class SaveStoreSiteDto {
	@Transform(({ value }) =>
		typeof value === 'string' ? value.trim().toLowerCase() : value,
	)
	@Matches(StoreSitesEnum.SLUG_REGEX)
	slug: string;

	@IsEnum(StoreSitesEnum.Template)
	templateId: StoreSitesEnum.Template;

	@ValidateNested()
	@Type(() => StoreSiteThemeDto)
	theme: StoreSiteThemeDto;

	@ValidateNested()
	@Type(() => StoreSiteHeroDto)
	hero: StoreSiteHeroDto;

	@IsArray()
	@ArrayMaxSize(StoreSitesEnum.MAX_SECTIONS)
	@ValidateNested({ each: true })
	@Type(() => StoreSiteSectionDto)
	sections: StoreSiteSectionDto[];

	@ValidateNested()
	@Type(() => StoreSiteMarqueeDto)
	marquee: StoreSiteMarqueeDto;

	@IsArray()
	@ArrayMaxSize(StoreSitesEnum.MAX_PRODUCTS)
	@IsMongoId({ each: true })
	productIds: string[];
}

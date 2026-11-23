import { Transform, Type } from 'class-transformer';
import {
	ArrayMaxSize,
	IsArray,
	IsBoolean,
	IsEnum,
	IsInt,
	IsMongoId,
	IsNotEmpty,
	IsObject,
	IsOptional,
	IsString,
	Matches,
	Max,
	MaxLength,
	Min,
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
	@IsArray()
	@ArrayMaxSize(StoreSitesEnum.MAX_HERO_EXTRA_IMAGES)
	@IsString({ each: true })
	@MaxLength(600, { each: true })
	backgroundImageUrls?: string[];

	@IsOptional()
	@IsInt()
	@Min(StoreSitesEnum.MIN_SLIDE_SECONDS)
	@Max(StoreSitesEnum.MAX_SLIDE_SECONDS)
	slideSeconds?: number;

	@IsOptional()
	@IsString()
	@MaxLength(600)
	featuredImageUrl: string | null;

	@IsOptional()
	@IsArray()
	@ArrayMaxSize(StoreSitesEnum.MAX_HERO_EXTRA_IMAGES)
	@IsString({ each: true })
	@MaxLength(600, { each: true })
	featuredImageUrls?: string[];

	@IsOptional()
	@IsInt()
	@Min(StoreSitesEnum.MIN_SLIDE_SECONDS)
	@Max(StoreSitesEnum.MAX_SLIDE_SECONDS)
	featuredSlideSeconds?: number;

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

export class StoreSiteLogoDto {
	@IsBoolean()
	isActive: boolean;

	@IsOptional()
	@IsString()
	@MaxLength(600)
	imageUrl: string | null;
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

	@IsOptional()
	@IsString()
	@MaxLength(60)
	displayName?: string | null;

	// Checked value by value when saved: see siteSizesOf.
	@IsOptional()
	@IsObject()
	sizes?: Record<string, unknown>;

	// Checked link by link when saved: see siteFooterOf.
	@IsOptional()
	@IsObject()
	footer?: Record<string, unknown>;

	// Checked when saved: see siteSignInOf.
	@IsOptional()
	@IsObject()
	signIn?: Record<string, unknown>;

	// Checked when saved: see siteAboutOf.
	@IsOptional()
	@IsObject()
	about?: Record<string, unknown>;

	// Checked page by page when saved: see sitePagesOf.
	@IsOptional()
	@IsArray()
	pages?: unknown[];

	// Checked when saved: see siteChatOf.
	@IsOptional()
	@IsObject()
	chat?: Record<string, unknown>;

	// Checked block by block when saved: see siteBlocksOf.
	@IsOptional()
	@IsArray()
	blocks?: unknown[];

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

	@IsOptional()
	@ValidateNested()
	@Type(() => StoreSiteLogoDto)
	logo?: StoreSiteLogoDto;

	@IsArray()
	@ArrayMaxSize(StoreSitesEnum.MAX_PRODUCTS)
	@IsMongoId({ each: true })
	productIds: string[];
}

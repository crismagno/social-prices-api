import { Transform, Type } from 'class-transformer';
import {
	ArrayMaxSize,
	ArrayMinSize,
	IsArray,
	IsEmail,
	IsInt,
	IsMongoId,
	IsNotEmpty,
	IsOptional,
	IsString,
	Max,
	MaxLength,
	Min,
	ValidateNested,
} from 'class-validator';

import StoreSitesEnum from '../store-sites.enum';

const trim = ({ value }: { value: unknown }): unknown =>
	typeof value === 'string' ? value.trim() : value;

export class SiteOrderAddressDto {
	@Transform(trim)
	@IsString()
	@IsNotEmpty()
	@MaxLength(160)
	address1: string;

	@Transform(trim)
	@IsOptional()
	@IsString()
	@MaxLength(160)
	address2: string | null;

	@Transform(trim)
	@IsString()
	@IsNotEmpty()
	@MaxLength(80)
	district: string;

	@Transform(trim)
	@IsString()
	@IsNotEmpty()
	@MaxLength(80)
	city: string;

	@Transform(trim)
	@IsString()
	@IsNotEmpty()
	@MaxLength(8)
	stateCode: string;

	@Transform(trim)
	@IsString()
	@IsNotEmpty()
	@MaxLength(60)
	stateName: string;

	@Transform(trim)
	@IsString()
	@IsNotEmpty()
	@MaxLength(16)
	zip: string;
}

export class SiteOrderBuyerDto {
	@Transform(trim)
	@IsString()
	@IsNotEmpty()
	@MaxLength(120)
	name: string;

	@Transform(({ value }) =>
		typeof value === 'string' ? value.trim().toLowerCase() : value,
	)
	@IsEmail()
	@MaxLength(160)
	email: string;

	@Transform(trim)
	@IsString()
	@IsNotEmpty()
	@MaxLength(30)
	phoneNumber: string;

	@ValidateNested()
	@Type(() => SiteOrderAddressDto)
	address: SiteOrderAddressDto;
}

export class SiteOrderItemDto {
	@IsMongoId()
	productId: string;

	@IsInt()
	@Min(1)
	@Max(StoreSitesEnum.MAX_ORDER_ITEM_QUANTITY)
	quantity: number;
}

export default class CreateSiteOrderDto {
	@ValidateNested()
	@Type(() => SiteOrderBuyerDto)
	buyer: SiteOrderBuyerDto;

	@IsArray()
	@ArrayMinSize(1)
	@ArrayMaxSize(StoreSitesEnum.MAX_ORDER_ITEMS)
	@ValidateNested({ each: true })
	@Type(() => SiteOrderItemDto)
	items: SiteOrderItemDto[];

	@Transform(trim)
	@IsOptional()
	@IsString()
	@MaxLength(600)
	note: string | null;
}

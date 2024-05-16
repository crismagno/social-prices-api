import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';

import AddressEnum from '../enums/address.enum';

export class AddressStateDto {
	@IsString()
	code: string;

	@IsString()
	name: string;
}

export class AddressCountryDto {
	@IsString()
	code: string;

	@IsString()
	name: string;
}

export class CreateAddressDto {
	@IsString()
	address1: string;

	@IsString()
	@IsOptional()
	address2: string | null;

	@IsString()
	city: string;

	@Type(() => AddressStateDto)
	state: AddressStateDto;

	@IsString()
	uid: string;

	@IsString()
	zip: string;

	@IsString()
	@IsOptional()
	description: string | null;

	@Type(() => AddressCountryDto)
	country: AddressCountryDto;

	@IsString()
	district: string;

	@IsArray()
	@IsEnum(AddressEnum.Type)
	types: AddressEnum.Type[];
}

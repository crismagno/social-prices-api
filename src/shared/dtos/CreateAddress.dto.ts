import { Type } from 'class-transformer';
import {
	IsArray,
	IsEnum,
	IsNotEmpty,
	IsOptional,
	IsString,
} from 'class-validator';

import AddressEnum from '../enums/address.enum';

export class AddressStateDto {
	@IsString()
	@IsNotEmpty()
	code: string;

	@IsString()
	@IsNotEmpty()
	name: string;
}

export class AddressCountryDto {
	@IsString()
	@IsNotEmpty()
	code: string;

	@IsString()
	@IsNotEmpty()
	name: string;
}

export class CreateAddressDto {
	@IsString()
	@IsNotEmpty()
	address1: string;

	@IsString()
	@IsOptional()
	address2: string | null;

	@IsString()
	@IsNotEmpty()
	city: string;

	@Type(() => AddressStateDto)
	state: AddressStateDto;

	@IsString()
	@IsNotEmpty()
	uid: string;

	@IsString()
	@IsNotEmpty()
	zip: string;

	@IsString()
	@IsOptional()
	description: string | null;

	@Type(() => AddressCountryDto)
	country: AddressCountryDto;

	@IsString()
	@IsNotEmpty()
	district: string;

	@IsArray()
	@IsEnum(AddressEnum.Type)
	types: AddressEnum.Type[];
}

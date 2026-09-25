import {
	IsArray,
	IsEmail,
	IsEnum,
	IsNotEmpty,
	IsOptional,
	IsString,
} from 'class-validator';

import { IAddress } from '../../../../shared/common/address/address.interface';
import PersonEnum from '../../../../shared/common/person/person.enum';
import { IPhoneNumber } from '../../../../shared/common/phone/phone-number.interface';
import UsersEnum from '../users.enum';

export default class UpdateUserByManagerDto {
	@IsString() @IsNotEmpty() name: string;
	@IsEmail() email: string;
	@IsString() @IsNotEmpty() username: string;
	@IsOptional() birthDate: any;
	@IsOptional() @IsEnum(PersonEnum.Gender) gender: PersonEnum.Gender | null;
	@IsOptional() @IsString() about: string | null;
	@IsOptional() @IsString() idNumber: string | null;
	@IsOptional() @IsString() cpf: string | null;
	@IsOptional() @IsString() cnpj: string | null;
	@IsEnum(UsersEnum.Status) status: UsersEnum.Status;
	@IsEnum(UsersEnum.Type) type: UsersEnum.Type;
	@IsOptional() @IsArray() phoneNumbers: IPhoneNumber[];
	@IsOptional() @IsArray() addresses: IAddress[];
}

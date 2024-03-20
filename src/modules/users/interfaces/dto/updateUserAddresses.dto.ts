import { IsArray } from 'class-validator';

import { IUserAddress } from '../user.interface';

export default class UpdateUserAddressesDto {
	@IsArray()
	addresses: IUserAddress[];
}

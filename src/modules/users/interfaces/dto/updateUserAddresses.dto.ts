import { IsArray } from 'class-validator';

import { IAddress } from '../../../../shared/interfaces/address.interface';

export default class UpdateUserAddressesDto {
	@IsArray()
	addresses: IAddress[];
}

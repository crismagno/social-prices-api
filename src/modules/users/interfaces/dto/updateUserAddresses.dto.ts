import { IsArray } from 'class-validator';

import { IAddress } from '../../../../shared/common/address/address.interface';

export default class UpdateUserAddressesDto {
	@IsArray()
	addresses: IAddress[];
}

import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export default class UpdateSaleCustomerManualDto {
	@IsString()
	@IsNotEmpty()
	saleId: string;

	@IsString()
	@IsNotEmpty()
	newCustomerId: string;

	@IsString()
	@IsOptional()
	newAddressUid: string | null;
}

import {
	Body,
	Controller,
	Delete,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';

import { AuthPayload } from '../auth/decorators/current-user.decorator';
import { IAuthPayload } from '../auth/interfaces/auth.types';
import { AccountService } from './account.service';
import RemoveAccountDto from './interfaces/dto/removeAccount.dto';

@Controller('api/v1/account')
export class AccountController {
	constructor(private readonly _accountService: AccountService) {}

	@Delete('/removeAccount')
	@UsePipes(ValidationPipe)
	public async removeAccount(
		@AuthPayload() authPayload: IAuthPayload,
		@Body() removeAccountDto: RemoveAccountDto,
	): Promise<void> {
		await this._accountService.removeAccount(
			authPayload._id,
			removeAccountDto.reason ?? null,
		);
	}
}

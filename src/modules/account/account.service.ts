import { Injectable, Logger } from '@nestjs/common';

import { ISoftDelete } from '../../shared/common/soft-delete/soft-delete.interface';
import { EmployeesService } from '../employees/employees.service';
import { ProductItemsService } from '../product-items/product-items.service';
import { ProductsService } from '../products/products.service';
import { StoresService } from '../stores/stores.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class AccountService {
	private readonly _logger: Logger;

	constructor(
		private readonly _usersService: UsersService,
		private readonly _storesService: StoresService,
		private readonly _employeesService: EmployeesService,
		private readonly _productsService: ProductsService,
		private readonly _productItemsService: ProductItemsService,
	) {
		this._logger = new Logger(AccountService.name);
	}

	public async removeAccount(
		userId: string,
		reason: string | null,
	): Promise<void> {
		await this._usersService.findOneByIdOrFail(userId);

		const now = new Date();

		const softDelete: ISoftDelete = {
			isDeleted: true,
			deletedAt: now,
			deletedByUserId: userId as any,
			deletedByEmployeeId: null,
			reason,
		};

		await Promise.all([
			this._storesService.deactivateByUserId(userId, softDelete),
			this._employeesService.deactivateByUserId(userId),
			this._productsService.deactivateByUserId(userId),
			this._productItemsService.deactivateByUserId(userId),
		]);

		await this._usersService.removeAccount(userId, softDelete);
	}
}

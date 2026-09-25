import { Module } from '@nestjs/common';

import { EmployeesModule } from '../employees/employees.module';
import { FeatureLimitsModule } from '../feature-limits/feature-limits.module';
import { ProductItemsModule } from '../product-items/product-items.module';
import { ProductsModule } from '../products/products.module';
import { StoresModule } from '../stores/stores.module';
import { UsersModule } from '../users/users.module';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';

@Module({
	imports: [
		UsersModule,
		FeatureLimitsModule,
		StoresModule,
		EmployeesModule,
		ProductsModule,
		ProductItemsModule,
	],
	controllers: [AccountController],
	providers: [AccountService],
})
export class AccountModule {}

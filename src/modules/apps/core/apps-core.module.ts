import { Module } from '@nestjs/common';

import { EmployeesModule } from '../../employees/employees.module';
import { UsersModule } from '../../users/users.module';
import { AppEmployeeLevelGuard } from './guards/app-employee-level.guard';
import { AppEnabledGuard } from './guards/app-enabled.guard';

/**
 * What every app can lean on and nothing of any single app: the two guards.
 * Users and Employees are re-exported because those guards, once used in an
 * app's controller, are built in that app's module.
 */
@Module({
	imports: [UsersModule, EmployeesModule],
	providers: [AppEnabledGuard, AppEmployeeLevelGuard],
	exports: [
		AppEnabledGuard,
		AppEmployeeLevelGuard,
		UsersModule,
		EmployeesModule,
	],
})
export class AppsCoreModule {}

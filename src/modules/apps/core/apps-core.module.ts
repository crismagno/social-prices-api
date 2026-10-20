import { Module } from '@nestjs/common';

import AuthorizationToken from '../../../infra/authorization/authorization-token';
import { EmployeesModule } from '../../employees/employees.module';
import { UsersModule } from '../../users/users.module';
import { AppEmployeeLevelGuard } from './guards/app-employee-level.guard';
import { AppEnabledGuard } from './guards/app-enabled.guard';
import { AppsRealtimeGateway } from './realtime/apps-realtime.gateway';

/**
 * What every app can lean on and nothing of any single app: the two guards and
 * the push of inbox changes to the browser.
 * Users and Employees are re-exported because those guards, once used in an
 * app's controller, are built in that app's module.
 */
@Module({
	imports: [UsersModule, EmployeesModule],
	providers: [
		AppEnabledGuard,
		AppEmployeeLevelGuard,
		AuthorizationToken,
		AppsRealtimeGateway,
	],
	exports: [
		AppEnabledGuard,
		AppEmployeeLevelGuard,
		AppsRealtimeGateway,
		UsersModule,
		EmployeesModule,
	],
})
export class AppsCoreModule {}

import { Module } from '@nestjs/common';

import { schemasModule } from '../../infra/database/mongo/schemas';
import { EmployeesModule } from '../employees/employees.module';
import { FeatureLimitsModule } from '../feature-limits/feature-limits.module';
import { UsersModule } from '../users/users.module';
import { AppsController } from './apps.controller';
import { APP_INTEGRATIONS, AppsRegistry } from './apps.registry';
import { AppsService } from './apps.service';
import { AppConnectionsService } from './connections/app-connections.service';
import { AppCredentialsVault } from './credentials/app-credentials.vault';
import { AppEmployeeLevelGuard } from './guards/app-employee-level.guard';
import { AppEnabledGuard } from './guards/app-enabled.guard';
import { IAppIntegration } from './interfaces/apps.types';
import { GooglePeopleClient } from './integrations/google-contacts/google-contacts.client';
import { GoogleContactsCustomersRepository } from './integrations/google-contacts/google-contacts.customers.repository';
import { GoogleContactsOAuthClient } from './integrations/google-contacts/google-contacts.oauth';
import { GoogleContactsService } from './integrations/google-contacts/google-contacts.service';
import { GoogleAccessTokenProvider } from './integrations/google-contacts/google-contacts.access-token';
import { GoogleContactsImportService } from './integrations/google-contacts/google-contacts-import.service';
import { GoogleContactsPreviewService } from './integrations/google-contacts/google-contacts-preview.service';
import { AppOAuthStateService } from './oauth/app-oauth-state.service';

@Module({
	imports: [
		schemasModule.appConnection,
		schemasModule.customer,
		UsersModule,
		EmployeesModule,
		FeatureLimitsModule,
	],
	controllers: [AppsController],
	providers: [
		AppsService,
		AppsRegistry,
		AppConnectionsService,
		AppCredentialsVault,
		AppOAuthStateService,
		AppEnabledGuard,
		AppEmployeeLevelGuard,
		GoogleContactsOAuthClient,
		GooglePeopleClient,
		GoogleContactsCustomersRepository,
		GoogleAccessTokenProvider,
		GoogleContactsPreviewService,
		GoogleContactsImportService,
		GoogleContactsService,
		// Add a new app's integration class to this list (and nowhere else).
		{
			provide: APP_INTEGRATIONS,
			useFactory: (google: GoogleContactsService): IAppIntegration[] => [
				google,
			],
			inject: [GoogleContactsService],
		},
	],
})
export class AppsModule {}

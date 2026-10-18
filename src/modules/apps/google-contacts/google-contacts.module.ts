import { Module } from '@nestjs/common';

import { AesGcmCipher } from '../../../infra/aes-gcm-cipher/aes-gcm-cipher';
import { schemasModule } from '../../../infra/database/mongo/schemas';
import { FeatureLimitsModule } from '../../feature-limits/feature-limits.module';
import { AppsCoreModule } from '../core/apps-core.module';
import { GoogleContactsConnectionsService } from './google-contacts-connections.service';
import { GoogleContactsImportService } from './google-contacts-import.service';
import { GoogleContactsPreviewService } from './google-contacts-preview.service';
import { GoogleAccessTokenProvider } from './google-contacts.access-token';
import { GooglePeopleClient } from './google-contacts.client';
import { GoogleContactsController } from './google-contacts.controller';
import { GoogleContactsCustomersRepository } from './google-contacts.customers.repository';
import { GoogleContactsOAuthClient } from './google-contacts.oauth';
import { GoogleContactsOAuthState } from './google-contacts.oauth-state';
import { GoogleContactsService } from './google-contacts.service';
import { GoogleContactsStatusProvider } from './google-contacts.status.provider';

/**
 * The Google Contacts app, self-contained: its own sign-in (OAuth), where it
 * keeps the connection and tokens, listing contacts and importing them.
 */
@Module({
	imports: [
		AppsCoreModule,
		schemasModule.googleContactsConnection,
		schemasModule.customer,
		FeatureLimitsModule,
	],
	controllers: [GoogleContactsController],
	providers: [
		AesGcmCipher,
		GoogleContactsService,
		GoogleContactsConnectionsService,
		GoogleContactsOAuthState,
		GoogleContactsOAuthClient,
		GooglePeopleClient,
		GoogleAccessTokenProvider,
		GoogleContactsPreviewService,
		GoogleContactsImportService,
		GoogleContactsCustomersRepository,
		GoogleContactsStatusProvider,
	],
	exports: [GoogleContactsStatusProvider],
})
export class GoogleContactsModule {}

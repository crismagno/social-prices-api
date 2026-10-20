import { Module } from '@nestjs/common';

import { AesGcmCipher } from '../../../infra/aes-gcm-cipher/aes-gcm-cipher';
import { schemasModule } from '../../../infra/database/mongo/schemas';
import { InboxModule } from '../../inbox/inbox.module';
import { FeatureLimitsModule } from '../../feature-limits/feature-limits.module';
import { AppsCoreModule } from '../core/apps-core.module';
import { InstagramChatsService } from './instagram-chats.service';
import { InstagramConnectionsService } from './instagram-connections.service';
import { InstagramMessagesService } from './instagram-messages.service';
import { InstagramController } from './instagram.controller';
import { InstagramCustomersRepository } from './instagram.customers.repository';
import { InstagramGraphClient } from './instagram.graph-client';
import { InstagramOAuthState } from './instagram.oauth-state';
import { InstagramInboxAdapter } from './instagram.inbox-adapter';
import { InstagramService } from './instagram.service';
import { InstagramStatusProvider } from './instagram.status.provider';

/**
 * The Instagram app, self-contained: its own sign-in (Instagram login), one
 * professional account per user, and the webhook Meta calls for that account's
 * direct messages.
 */
@Module({
	imports: [
		AppsCoreModule,
		schemasModule.instagramConnection,
		schemasModule.customer,
		FeatureLimitsModule,
		InboxModule,
	],
	controllers: [InstagramController],
	providers: [
		AesGcmCipher,
		InstagramService,
		InstagramInboxAdapter,
		InstagramGraphClient,
		InstagramOAuthState,
		InstagramConnectionsService,
		InstagramMessagesService,
		InstagramChatsService,
		InstagramCustomersRepository,
		InstagramStatusProvider,
	],
	exports: [InstagramStatusProvider],
})
export class InstagramModule {}

import { Module } from '@nestjs/common';

import { AesGcmCipher } from '../../../infra/aes-gcm-cipher/aes-gcm-cipher';
import { schemasModule } from '../../../infra/database/mongo/schemas';
import { FeatureLimitsModule } from '../../feature-limits/feature-limits.module';
import { AppsCoreModule } from '../core/apps-core.module';
import { MessengerChatsService } from './messenger-chats.service';
import { MessengerConnectionsService } from './messenger-connections.service';
import { MessengerMessagesService } from './messenger-messages.service';
import { MessengerController } from './messenger.controller';
import { MessengerCustomersRepository } from './messenger.customers.repository';
import { MessengerGraphClient } from './messenger.graph-client';
import { MessengerOAuthState } from './messenger.oauth-state';
import { MessengerService } from './messenger.service';
import { MessengerStatusProvider } from './messenger.status.provider';

/**
 * The Facebook Messenger app, self-contained: its own sign-in (Facebook login),
 * one Page per user, and the webhook Meta calls for that Page's messages.
 */
@Module({
	imports: [
		AppsCoreModule,
		schemasModule.messengerConnection,
		schemasModule.messengerMessage,
		schemasModule.messengerChat,
		schemasModule.customer,
		FeatureLimitsModule,
	],
	controllers: [MessengerController],
	providers: [
		AesGcmCipher,
		MessengerService,
		MessengerGraphClient,
		MessengerOAuthState,
		MessengerConnectionsService,
		MessengerMessagesService,
		MessengerChatsService,
		MessengerCustomersRepository,
		MessengerStatusProvider,
	],
	exports: [MessengerStatusProvider],
})
export class MessengerModule {}

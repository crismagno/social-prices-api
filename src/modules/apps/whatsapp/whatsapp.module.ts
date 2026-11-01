import { Module } from '@nestjs/common';

import { AesGcmCipher } from '../../../infra/aes-gcm-cipher/aes-gcm-cipher';
import { schemasModule } from '../../../infra/database/mongo/schemas';
import { InboxModule } from '../../inbox/inbox.module';
import { AppsCoreModule } from '../core/apps-core.module';
import { WhatsappConnectionsService } from './whatsapp-connections.service';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappGraphClient } from './whatsapp.graph-client';
import { WhatsappInboxAdapter } from './whatsapp.inbox-adapter';
import { WhatsappService } from './whatsapp.service';
import { WhatsappStatusProvider } from './whatsapp.status.provider';

/**
 * The WhatsApp app, self-contained: each user connects their own business number
 * through Embedded Signup, Meta's webhook brings its messages into the central
 * inbox, and answers go out through the number.
 */
@Module({
	imports: [AppsCoreModule, schemasModule.whatsappConnection, InboxModule],
	controllers: [WhatsappController],
	providers: [
		AesGcmCipher,
		WhatsappService,
		WhatsappGraphClient,
		WhatsappConnectionsService,
		WhatsappInboxAdapter,
		WhatsappStatusProvider,
	],
	exports: [WhatsappStatusProvider],
})
export class WhatsappModule {}

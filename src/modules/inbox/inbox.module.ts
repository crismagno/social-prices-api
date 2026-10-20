import { Module } from '@nestjs/common';

import { schemasModule } from '../../infra/database/mongo/schemas';
import { AppsCoreModule } from '../apps/core/apps-core.module';
import { InboxCentralService } from './inbox-central.service';
import { InboxController } from './inbox.controller';
import { InboxChannelRegistry } from './inbox-channel.registry';
import { InboxConversationsService } from './inbox-conversations.service';
import { InboxMessagesService } from './inbox-messages.service';

/**
 * The central inbox: every channel's conversations and messages in one place, so
 * a customer can have them all together. The channels store through it, and the
 * central page reads from it.
 */
@Module({
	imports: [
		AppsCoreModule,
		schemasModule.inboxConversation,
		schemasModule.inboxMessage,
		schemasModule.customer,
	],
	controllers: [InboxController],
	providers: [
		InboxCentralService,
		InboxConversationsService,
		InboxMessagesService,
		InboxChannelRegistry,
	],
	exports: [
		InboxConversationsService,
		InboxMessagesService,
		InboxChannelRegistry,
	],
})
export class InboxModule {}

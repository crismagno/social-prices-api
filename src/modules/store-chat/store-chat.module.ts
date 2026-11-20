import { Module } from '@nestjs/common';

import { schemasModule } from '../../infra/database/mongo/schemas';
import { AppsCoreModule } from '../apps/core/apps-core.module';
import { CustomerOnlyGuard } from '../customer-portal/customer-only.guard';
import { InboxModule } from '../inbox/inbox.module';
import { StoreChatOwnerController } from './store-chat-owner.controller';
import { StoreChatOwnerService } from './store-chat-owner.service';
import { StoreChatStoresService } from './store-chat-stores.service';
import { StoreChatController } from './store-chat.controller';
import { StoreChatInboxAdapter } from './store-chat.inbox-adapter';
import { StoreChatService } from './store-chat.service';

/**
 * The platform's own chat between a customer account and a store. It is a
 * channel of the central inbox: the store answers from there, and this module
 * serves the customer's side of the same conversations.
 */
@Module({
	imports: [
		AppsCoreModule,
		InboxModule,
		schemasModule.store,
		schemasModule.customer,
		schemasModule.sale,
		schemasModule.user,
	],
	controllers: [StoreChatController, StoreChatOwnerController],
	providers: [
		StoreChatService,
		StoreChatOwnerService,
		StoreChatStoresService,
		StoreChatInboxAdapter,
		CustomerOnlyGuard,
	],
})
export class StoreChatModule {}

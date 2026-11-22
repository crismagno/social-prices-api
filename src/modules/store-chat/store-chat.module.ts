import { Module } from '@nestjs/common';

import { schemasModule } from '../../infra/database/mongo/schemas';
import { AppsCoreModule } from '../apps/core/apps-core.module';
import { CustomerOnlyGuard } from '../customer-portal/customer-only.guard';
import { FilesModule } from '../files/files.module';
import { InboxModule } from '../inbox/inbox.module';
import { StoreSitesModule } from '../store-sites/store-sites.module';
import { StoreChatDeletionService } from './store-chat-deletion.service';
import { StoreChatEditionService } from './store-chat-edition.service';
import { StoreChatMediaService } from './store-chat-media.service';
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
		FilesModule,
		StoreSitesModule,
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
		StoreChatDeletionService,
		StoreChatEditionService,
		StoreChatMediaService,
		StoreChatInboxAdapter,
		CustomerOnlyGuard,
	],
})
export class StoreChatModule {}

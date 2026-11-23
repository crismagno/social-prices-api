import { Module } from '@nestjs/common';

import { schemasModule } from '../../infra/database/mongo/schemas';
import { AppsCoreModule } from '../apps/core/apps-core.module';
import { CustomersModule } from '../customers/customers.module';
import { EmployeesModule } from '../employees/employees.module';
import { FilesModule } from '../files/files.module';
import { InboxModule } from '../inbox/inbox.module';
import { ProductItemsModule } from '../product-items/product-items.module';
import { ProductsModule } from '../products/products.module';
import { SalesModule } from '../sales/sales.module';
import { StoresModule } from '../stores/stores.module';
import { SiteChatRateLimiter } from './site-chat-rate-limiter';
import { SiteChatController } from './site-chat.controller';
import { SiteChatInboxAdapter } from './site-chat.inbox-adapter';
import { SiteChatService } from './site-chat.service';
import { SiteOrderRateLimiter } from './site-order-rate-limiter';
import { StoreSiteOrdersService } from './store-site-orders.service';
import { StoreSitesPublicController } from './store-sites-public.controller';
import { StoreSitesPublicService } from './store-sites-public.service';
import { UsersModule } from '../users/users.module';
import { StoreSitesController } from './store-sites.controller';
import { StoreSitesService } from './store-sites.service';
import { StoreSitesStatusProvider } from './store-sites.status.provider';

/** The public storefront of a store: its content, its address, its orders. */
@Module({
	imports: [
		schemasModule.storeSite,
		AppsCoreModule,
		InboxModule,
		schemasModule.siteChatGuest,
		FilesModule,
		StoresModule,
		ProductsModule,
		ProductItemsModule,
		SalesModule,
		CustomersModule,
		EmployeesModule,
		UsersModule,
	],
	controllers: [
		StoreSitesController,
		StoreSitesPublicController,
		SiteChatController,
	],
	providers: [
		StoreSitesService,
		StoreSitesPublicService,
		SiteChatService,
		SiteChatRateLimiter,
		SiteChatInboxAdapter,
		StoreSiteOrdersService,
		SiteOrderRateLimiter,
		StoreSitesStatusProvider,
	],
	exports: [
		StoreSitesService,
		StoreSitesPublicService,
		StoreSitesStatusProvider,
	],
})
export class StoreSitesModule {}

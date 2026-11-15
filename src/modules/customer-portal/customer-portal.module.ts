import { Module } from '@nestjs/common';

import { schemasModule } from '../../infra/database/mongo/schemas';
import { CustomerOnlyGuard } from './customer-only.guard';
import { CustomerPortalController } from './customer-portal.controller';
import { CustomerPortalService } from './customer-portal.service';

/** Where a CUSTOMER account sees the sales made for them. Read only. */
@Module({
	imports: [schemasModule.sale, schemasModule.store, schemasModule.product],
	controllers: [CustomerPortalController],
	providers: [CustomerPortalService, CustomerOnlyGuard],
})
export class CustomerPortalModule {}

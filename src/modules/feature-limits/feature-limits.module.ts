import { Module } from '@nestjs/common';

import { schemasModule } from '../../infra/database/mongo/schemas';
import { UsersModule } from '../users/users.module';
import { FeatureLimitsService } from './feature-limits.service';

@Module({
	imports: [
		schemasModule.product,
		schemasModule.productItem,
		schemasModule.customer,
		schemasModule.employee,
		schemasModule.store,
		schemasModule.category,
		schemasModule.tag,
		UsersModule,
	],
	providers: [FeatureLimitsService],
	exports: [FeatureLimitsService],
})
export class FeatureLimitsModule {}

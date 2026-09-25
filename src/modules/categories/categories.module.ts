import { Module } from '@nestjs/common';

import { FeatureLimitsModule } from '../feature-limits/feature-limits.module';
import { schemasModule } from '../../infra/database/mongo/schemas';
import { UsersModule } from '../users/users.module';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

@Module({
	imports: [FeatureLimitsModule, schemasModule.category, UsersModule],
	controllers: [CategoriesController],
	providers: [CategoriesService],
	exports: [CategoriesService],
})
export class CategoriesModule {}

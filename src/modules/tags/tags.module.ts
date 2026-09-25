import { Module } from '@nestjs/common';

import { FeatureLimitsModule } from '../feature-limits/feature-limits.module';
import { schemasModule } from '../../infra/database/mongo/schemas';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';

@Module({
	providers: [TagsService],
	imports: [FeatureLimitsModule, schemasModule.tag],
	controllers: [TagsController],
	exports: [TagsService],
})
export class TagsModule {}

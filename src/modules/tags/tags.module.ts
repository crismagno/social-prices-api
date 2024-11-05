import { Module } from '@nestjs/common';

import { schemasModule } from '../../infra/database/mongo/schemas';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';

@Module({
	providers: [TagsService],
	imports: [schemasModule.tag],
	controllers: [TagsController],
	exports: [TagsService],
})
export class TagsModule {}

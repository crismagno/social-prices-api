import { Module } from '@nestjs/common';

import { schemasModule } from '../../infra/database/mongo/schemas';
import { TagsService } from './tags.service';
import { TagsController } from './tags.controller';

@Module({
	providers: [TagsService],
	imports: [schemasModule.tag],
	controllers: [TagsController],
})
export class TagsModule {}

import { Module } from '@nestjs/common';

import { schemasModule } from '../../infra/database/mongo/schemas';
import { LogsService } from './logs.service';

@Module({
	imports: [schemasModule.log],
	controllers: [],
	providers: [LogsService],
	exports: [LogsService],
})
export class LogsModule {}

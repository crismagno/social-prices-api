import { Module } from '@nestjs/common';

import { schemasModule } from '../../infra/database/mongo/schemas';
import { CountersModule } from '../counters/counters.module';
import { LogsService } from './logs.service';

@Module({
	imports: [schemasModule.log, CountersModule],
	controllers: [],
	providers: [LogsService],
	exports: [LogsService],
})
export class LogsModule {}

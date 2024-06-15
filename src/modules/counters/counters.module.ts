import { Module } from '@nestjs/common';

import { schemasModule } from '../../infra/database/mongo/schemas';
import { CountersService } from './counters.service';

@Module({
	imports: [schemasModule.counter],
	controllers: [],
	providers: [CountersService],
	exports: [CountersService],
})
export class CountersModule {}

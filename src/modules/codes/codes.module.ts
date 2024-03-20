import { Module } from '@nestjs/common';

import { schemasModule } from '../../infra/database/mongo/schemas';
import { CodesService } from './codes.service';

@Module({
	imports: [schemasModule.code],
	providers: [CodesService],
	exports: [CodesService],
})
export class CodesModule {}

import { Module } from '@nestjs/common';

import { schemasModule } from '../shared/modules/imports/schemas/schemas';
import { CodesService } from './codes.service';

@Module({
	imports: [schemasModule.code],
	providers: [CodesService],
	exports: [CodesService],
})
export class CodesModule {}

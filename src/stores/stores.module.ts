import { Module } from '@nestjs/common';

import { schemasModule } from '../shared/modules/imports/schemas/schemas';
import { StoresController } from './stores.controller';
import { StoresService } from './stores.service';

@Module({
	imports: [schemasModule.store],
	providers: [StoresService],
	controllers: [StoresController],
})
export class StoresModule {}

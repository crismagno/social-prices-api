import { Module } from '@nestjs/common';

import { FilesService } from '../../infra/services/files/files-service';
import { FilesController } from './files.controller';

@Module({
	imports: [],
	controllers: [FilesController],
	providers: [FilesService],
	exports: [],
})
export class FilesModule {}

import { Module } from '@nestjs/common';

import { schemasModule } from '../../infra/database/mongo/schemas';
import { FilesUploadsController } from './files-uploads.controller';
import { FilesUploadsService } from './files-uploads.service';

@Module({
	imports: [schemasModule.fileUpload],
	providers: [FilesUploadsService],
	exports: [FilesUploadsService],
	controllers: [FilesUploadsController],
})
export class FilesUploadsModule {}

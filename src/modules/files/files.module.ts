import { Module } from '@nestjs/common';

import { ChatFilesService } from './chat-files-service';
import { FilesService } from './files-service';
import { FilesController } from './files.controller';

@Module({
	imports: [],
	controllers: [FilesController],
	providers: [FilesService, ChatFilesService],
	exports: [FilesService, ChatFilesService],
})
export class FilesModule {}

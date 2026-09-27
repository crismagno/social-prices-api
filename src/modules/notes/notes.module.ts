import { Module } from '@nestjs/common';

import { schemasModule } from '../../infra/database/mongo/schemas';
import { NotesController } from './notes.controller';
import { NotesService } from './notes.service';

@Module({
	imports: [schemasModule.note],
	controllers: [NotesController],
	providers: [NotesService],
})
export class NotesModule {}
